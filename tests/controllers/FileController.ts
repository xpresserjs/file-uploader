import { sizeToString, uploadFiles, uploadFile } from "../../";
import fs = require("fs");
import { getInstance } from "xpresser";
import { Controller, Http } from "xpresser/types/http";

const $ = getInstance();
const uploadsFolder = $.path.storage("public");

/**
 * FileController
 */
export = <Controller.Object>{
  // Controller Name
  name: "FileController",

  // Controller Default Service Error Handler.
  e: (http: Http, error: unknown) => http.status(401).send({ error }),

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
    const file = await uploadFile(http, "avatar", {
      size: 5, // size in megabyte
      mimetype: new RegExp("audio|image|zip")
    });

    // Check for error
    if (file.error()) {
      return http.send({ file, error: file.error() });
    }

    // Save File
    await file.saveTo(uploadsFolder);

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
    const images = await uploadFiles(http, ["images", "docs"], {
      size: 100,
      extensionsForEachField: {
        images: ["png", "gif"],
        docs: ["pdf", "mp3"]
      }
    });

    // check errors
    if (images.hasFilesWithErrors()) {
      const filesWithErrors = images.filesWithError();

      return http.send({
        message: "Upload encountered some errors",
        filesWithErrors,
        errors: images.errorMessages()
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
      const file = http.body<string>("file");

      if (!file) return http.send("No file found in delete request!");

      $.file.delete($.path.base(file));

      return http.redirectBack();
    } catch (e) {
      return http.send((e as Error).message);
    }
  },

  flush(http) {
    try {
      // @ts-ignore
      $.file.deleteDirectory(uploadsFolder, { recursive: true });
      return http.redirectBack();
    } catch (e: any) {
      return http.send(e.message);
    }
  }
};
