const path = require("path");
const sizeOf = require("image-size");

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/uploads");
  eleventyConfig.addPassthroughCopy("src/admin");

  eleventyConfig.addCollection("posts", function (collectionApi) {
    return collectionApi.getFilteredByGlob("src/posts/*.md").sort((a, b) => {
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

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
    },
  };
};
