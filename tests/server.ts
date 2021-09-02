import { init } from "xpresser";

const $ = init({
  name: "Test File Uploader",
  env: process.env.NODE_ENV || "development",

  paths: {
    base: __dirname,
    backend: "base://",
    storage: `${__dirname}/storage`
  }
});

$.initializeTypescript(__filename);

/** Add Routes **/
$.on.boot((next) => {
  $.router.get("/", "File@index");
  $.router.post("/", "File@uploadSingleFile");
  $.router.post("/delete", "File@delete");
  $.router.post("/flush", "File@flush");
  $.router.post("/multiple_upload", "File@uploadMultipleFiles");

  return next();
});

// Boot Server
$.boot();
