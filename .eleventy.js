const fs = require("fs");
const path = require("path");
const sizeOf = require("image-size");
const Image = require("@11ty/eleventy-img");

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/uploads");
  eleventyConfig.addPassthroughCopy("src/admin");
  eleventyConfig.addPassthroughCopy("src/favicon.svg");

  eleventyConfig.addCollection("posts", function (collectionApi) {
    return collectionApi.getFilteredByGlob("src/posts/*.md").sort((a, b) => {
      return new Date(b.data.date) - new Date(a.data.date);
    });
  });

  eleventyConfig.addCollection("songs", function (collectionApi) {
    return collectionApi.getFilteredByGlob("src/songs/*.md").sort((a, b) => {
      return new Date(b.data.date) - new Date(a.data.date);
    });
  });

  // Reads an uploaded image's real pixel dimensions at build time (e.g.
  // "/uploads/foo.jpg" -> {width, height}), so the <img> tag can carry its
  // true aspect ratio and the browser reserves the right amount of space
  // before the (lazy-loaded) image file itself has downloaded — avoiding
  // the layout jump that would otherwise happen as each image loads in.
  eleventyConfig.addFilter("imageDimensions", function (src) {
    if (!src) return { width: 0, height: 0 };
    try {
      const filePath = path.join(__dirname, "src", src);
      const dims = sizeOf(filePath);
      return { width: dims.width, height: dims.height };
    } catch (e) {
      return { width: 0, height: 0 };
    }
  });

  // Resizes and recompresses every uploaded photo — no matter how large
  // the original file is, what actually ships is capped to a sensible max
  // width and re-encoded as a reasonably compressed JPEG.
  //
  // This runs *before* templates render (via the eleventy.before hook)
  // rather than as an async shortcode called during rendering — async
  // shortcodes don't reliably resolve when called from inside a Nunjucks
  // macro (which post-card.njk is), silently producing empty output
  // instead of an image. Precomputing into a plain synchronous lookup
  // table sidesteps that entirely.
  const optimizedImageCache = {};

  eleventyConfig.on("eleventy.before", async () => {
    const postsDir = path.join(__dirname, "src", "posts");
    if (!fs.existsSync(postsDir)) return;

    const files = fs.readdirSync(postsDir).filter((f) => f.endsWith(".md"));
    for (const file of files) {
      const content = fs.readFileSync(path.join(postsDir, file), "utf8");
      const match = content.match(/^image:\s*(\S+)\s*$/m);
      if (!match) continue;
      const src = match[1].trim();
      if (optimizedImageCache[src]) continue;

      const inputPath = path.join(__dirname, "src", src);
      try {
        const metadata = await Image(inputPath, {
          widths: [2000],
          formats: ["jpeg"],
          outputDir: path.join(__dirname, "_site", "uploads-optimized"),
          urlPath: "/uploads-optimized/",
          sharpJpegOptions: { quality: 80 },
        });
        const data = metadata.jpeg[0];
        optimizedImageCache[src] = { url: data.url, width: data.width, height: data.height };
      } catch (e) {
        // If optimization fails for any reason, fall back to the original
        // file rather than breaking the build.
        optimizedImageCache[src] = { url: src, width: 0, height: 0 };
      }
    }
  });

  eleventyConfig.addFilter("optimizedImage", function (src) {
    if (!src) return { url: "", width: 0, height: 0 };
    return optimizedImageCache[src] || { url: src, width: 0, height: 0 };
  });

  // YAML frontmatter silently parses an unquoted "date: 2016-10-29" into a
  // real JS Date object rather than the string "2016-10-29" — printing
  // that directly gives something like "Sat Oct 29 2016 00:00:00 GMT...",
  // which the age-signal's JS date parser can't read. Always format
  // through this filter wherever a date is written into the page, so it's
  // reliably "YYYY-MM-DD" regardless of what type the frontmatter value
  // came in as.
  eleventyConfig.addFilter("isoDate", function (value) {
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return "";
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
    },
  };
};
