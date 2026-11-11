const xss = require("xss");

function sanitizeContent(content, options) {
  const whiteList = Object.fromEntries(
    options.allowedTags.map((tag) => [tag, options.allowedAttributes[tag] || []])
  );

  return xss(content, {
    whiteList,
    stripIgnoreTag: true,
    stripIgnoreTagBody: ["script", "style"]
  });
}

module.exports = sanitizeContent;
