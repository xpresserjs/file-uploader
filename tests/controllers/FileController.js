const { sizeToString } = require("../../");

const fs = require("fs");
const { getInstance } = require("xpresser");
const $ = getInstance();
const uploadsFolder = $.path.storage("public");

/**
 * FileController
 * @type {Xpresser.Controller.Object}
 */
module.exports = {
  // Controller Name
  name: "FileController",

  // Controller Default Service Error Handler.
  e: (http, error) => http.status(401).send({ error }),

  /**
   * Index Controller
   * @param http {Xpresser.Http}
   * @returns {*}
   */
  index(http) {
    /**
     * Get List of files in public folder.
     */
    const files = $.file.readDirectory(uploadsFolder) || [];
    const data = [];

    /**
     * Loop through file and get stats
     */
    for (const file of files) {
      const fullPath = uploadsFolder + "/" + file;
      const { birthtime, size } = fs.statSync(uploadsFolder + "/" + file);

      data.push({
        name: file,
        path: fullPath.replace($.path.base(), ""),
        added: birthtime,
        size: sizeToString(size)
      });
    }

    return http.view("index", { files: data });
  },

  async uploadSingleFile(http) {
    /**
     * @type {UploadedFile}
     */
    const file = await http.file("avatar", {
      size: 5, // size in megabyte
      mimetype: new RegExp("audio|image")
    });

    // Check for error
    if (file.error()) {
      return http.send(file);
    }

    // Save File
    await file.saveTo(uploadsFolder);
    //
    // check for save error()
    if (!file.isSaved()) {
      return http.send(file.saveError());
    }

    // return response.
    return http.redirectBack();
  },

  /**
   * @param http {Xpresser.Http}
   */
  async uploadMultipleFiles(http) {
    /**
     * @type {UploadedFiles}
     */
    const images = await http.files(["images", "docs"], {
      size: 5, // size in megabytes
      // mimetype: "image"
      // mimetypeForEachField: {
      //   images: "image",
      //   docs: new RegExp("(pdf|doc|txt)")
      // },
      extensionsForEachField: {
        images: ["png", "gif"],
        docs: ["pdf", "mp3"]
      },

      customErrors: {}
    });

    // check errors
    if (images.hasFilesWithErrors()) {
      const filesWithErrors = images.filesWithError();

      return http.send({
        message: "Upload encountered some errors",
        filesWithErrors
      });
    }

    // Save all files to one folder
    await images.saveFiles(uploadsFolder);

    // return response
    return http.redirectBack();
  },

  /**
   * Delete File
   * @param http {Xpresser.Http}
   */
  delete(http) {
    try {
      /**
       * @type {string}
       */
      const file = http.body("file");

      if (!file) return http.send("No file found in delete request!");

      $.file.delete($.path.base(file));

      return http.redirectBack();
    } catch (e) {
      return http.send(e.message);
    }
  },

  flush(http) {
    try {
      $.file.deleteDirectory(uploadsFolder, { recursive: true });

      console.log(uploadsFolder);
      return http.redirectBack();
    } catch (e) {
      return http.send(e.message);
    }
  }
};
