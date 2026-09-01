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

  // Resizes and recompresses every uploaded photo at build time — no
  // matter how large the original file is, what actually ships is capped
  // to a sensible max width and re-encoded as a reasonably compressed
  // JPEG. Runs once per unique image (results are cached in .cache/), so
  // rebuilds after the first stay fast.
  eleventyConfig.addNunjucksAsyncShortcode("optimizedImage", async function (src, alt) {
    if (!src) return "";
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
      return `<img src="${data.url}" width="${data.width}" height="${data.height}" alt="${alt || ""}" loading="lazy">`;
    } catch (e) {
      // If anything goes wrong optimizing (unsupported format, etc.), fall
      // back to serving the original file rather than breaking the build.
      return `<img src="${src}" alt="${alt || ""}" loading="lazy">`;
    }
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
    },
  };
};
