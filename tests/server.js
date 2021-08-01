const { init } = require("xpresser");

const $ = init({
  name: "Test File Uploader",
  env: process.env.NODE_ENV || "development",

  paths: {
    base: __dirname,
    backend: "base://",
    storage: `${__dirname}/storage`
  }
});

/** Add Routes **/
$.on.boot((next) => {
  $.router.get("/", "File@index");
  $.router.post("/", "File@uploadSingleFile");
  $.router.post("/delete", "File@delete");
  $.router.post("/multiple_upload", "File@uploadMultipleFiles");

  return next();
});

// Boot Server
$.boot();
