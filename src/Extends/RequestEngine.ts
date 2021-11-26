import Busboy = require("busboy");
import fs = require("fs");
import os = require("os");
import path = require("path");
import UploadedFile = require("../UploadedFile");
import UploadedFiles = require("../UploadedFiles");
import type RequestEngine from "xpresser/src/RequestEngine";
import type { FileData, MultipleFilesOptions, SingleFileOptions } from "../types";
import type { BusboyHeaders } from "busboy";

export = function (RE: typeof RequestEngine): typeof RequestEngine {
  return class XpresserFileUploader extends RE {
    /**
     * Check if request is multipart form.
     */
    isMultiPartFormData() {
      const headers = this.req.headers;

      if (!headers.hasOwnProperty("content-type")) return false;

      const contentType = headers["content-type"] || "";

      return (
        contentType.includes("multipart/form-data") && contentType.includes("boundary")
      );
    }

    /**
     * Single File Upload
     * @returns {Promise<UploadedFile.ts>}
     * @param fieldName
     * @param options
     */
    file(fieldName: string, options: Partial<SingleFileOptions> = {}) {
      if (!this.isMultiPartFormData())
        throw "Request must be of type multipart/form-data";

      return new Promise((resolve, reject) => {
        // Get Xpresser Instance
        const $ = this.$instance();

        // Assign default option values.
        const $opts = {
          size: 5,
          includeBody: true,
          ...options
        };

        // Convert to bytes.
        $opts.size = $opts.size * 1000000;

        // Current Request
        const req = this.req;

        try {
          /**
           * $data holds this process data.
           * @type {object|boolean}
           */
          let $data: false | FileData = false;

          /**
           * $seen checks if field has been found to stop process once it is
           * @type {boolean}
           */
          let $seen: boolean = false;

          /**
           * Populates body that comes with the request if $opts.includeBody === true
           * @type {{}}
           */
          let $body: Record<string, any> = {};

          /**
           * This variable holds the state for the upload of the single file.
           * @type {boolean}
           */
          let $isStreamingFile: boolean = false;

          /**
           * Initialize busboy
           * passing req.headers and setting limits
           */
          const busboy = new Busboy({
            headers: req["headers"] as BusboyHeaders,
            limits: {
              files: 1,
              fileSize: $opts.size
            }
          });

          /**
           * If $opts.includeBody == true
           * Populate $body
           */
          if ($opts.includeBody) {
            busboy.on("field", (key, val) => {
              $body[key] = val;
            });
          }

          // On Busboy file event we validate incoming file.
          busboy.on("file", async (fieldname, file, filename, encoding, mimetype) => {
            // If file has been found or is not the field name we are expecting
            // Stop and ignore.
            // file.resume() resumes uploads
            if ($seen || fieldname !== fieldName) return file.resume();

            // if seen and fieldname matches the field we are looking for.
            // Set seen to true, so if another file event is received it will be ignored.
            $seen = true;

            // Trim File Name
            filename = String(filename).trim();
            let $ext = filename.split(".").pop()?.toLowerCase();

            // Set default data attributes.
            $data = {
              expectedField: fieldName,
              field: fieldname,
              name: filename,
              encoding,
              mimetype,
              size: 0
            };

            /**
             * Expected mimetype is the mimetype option set.
             *
             * The option expects a string to or a regex expression to test with.
             */
            const expectedMimetype = $opts.mimetype;

            /**
             * check if mimetype is valid.
             *
             * By default it is false,
             * but if user did not define and mimetype rule it is set to true.
             */
            let mimetypeIsValid = !expectedMimetype;

            if (expectedMimetype) {
              /**
               * - Check if mimetype option is a regex expression
               * if true and regex test is true set mimetypeIsValid = true
               *
               * - else if mimetype option is a string we check if option is in mimetype
               * if true set mimetypeIsValid = true
               */
              if (expectedMimetype instanceof RegExp && expectedMimetype.test(mimetype)) {
                mimetypeIsValid = true;
              } else if (
                typeof expectedMimetype === "string" &&
                mimetype.includes(expectedMimetype)
              ) {
                mimetypeIsValid = true;
              }
            }

            /**
             * Check for expected extensions.
             *
             * if file extension using mimetype matches array of extensions provided.
             */
            let extensionIsValid: boolean;
            const expectedExtensions = $opts.extensions;

            if (
              expectedExtensions &&
              Array.isArray(expectedExtensions) &&
              expectedExtensions.length
            ) {
              $data.expectedExtensions = expectedExtensions;
              const extByMimetype = $ext || false;
              extensionIsValid = !!(
                extByMimetype && expectedExtensions.includes(extByMimetype)
              );
            } else {
              extensionIsValid = true;
            }

            // if mimetype and extensions is valid, move file to temp folder.
            if (mimetypeIsValid && extensionIsValid) {
              // Create random file name.
              const tmpName = "xpresser_" + $.helpers.randomStr(50).toUpperCase();
              // Get OS tmpDir
              const saveTo = path.join(os.tmpdir(), tmpName);
              // $.file.makeDirIfNotExist(saveTo, true);
              // Add tmpPath to $data
              $data.tmpPath = saveTo;

              // Create File Stream
              const stream = fs.createWriteStream(saveTo, { flags: "a" });
              file.pipe(stream);
              $isStreamingFile = true;

              stream.on("error", reject);

              // Resolve on finish
              stream.on("finish", () => {
                resolve(new UploadedFile($data as FileData, $body, $opts.customErrors));
              });

              /**
               * On Busboy file limit event we try to unpipe, destroy stream and unlink file.
               */
              file.on("limit", () => {
                ($data as FileData).reachedLimit = true;

                try {
                  // try unpipe and destroy steam.
                  file.unpipe();
                  stream.destroy();

                  // try un-linking file
                  fs.unlinkSync(saveTo);
                } catch (e) {
                  // do nothing but log error
                  $.logError(e);
                }

                file.resume();
              });
            } else {
              /**
               * If mimetype is not valid we set the expectedMimetype value
               * The File class records an error once this key is found.
               */
              if (!mimetypeIsValid)
                ($data as FileData).expectedMimetype = String($opts.mimetype);

              /**
               * If extensions is not valid we set the expectedExtensions value
               * The File class records an error once this key is found.
               */
              if (!extensionIsValid)
                ($data as FileData).expectedExtensions = expectedExtensions as string[];

              // Resume file upload.
              file.resume();
            }
          });

          // On Busboy finish we return UploadedFile
          busboy.on("finish", () => {
            if (typeof $data === "object" && (!$isStreamingFile || $data.reachedLimit)) {
              resolve(new UploadedFile($data, $body, $opts.customErrors));
            } else if ($data === false) {
              /**
               * Else if no $data then we did not find the field the user defined.
               * The add the expectedField key, The File class records an error once this key is found.
               */
              resolve(
                new UploadedFile(
                  { expectedField: fieldName } as any,
                  $body,
                  $opts.customErrors
                )
              );
            }
          });

          req.pipe(busboy);
        } catch (e) {
          reject(e);
        }
      });
    }

    /**
     * Multiple Files Upload
     * @param fields
     * @param options
     * @returns {Promise<UploadedFiles.ts>}
     */
    files(fields: string | string[], options: MultipleFilesOptions = {}) {
      if (!this.isMultiPartFormData())
        throw "Request must be of type multipart/form-data";

      return new Promise((resolve, reject) => {
        const $ = this.$instance();

        if (typeof fields === "string") fields = [fields];

        // if no size set default to 5MB
        options.size = (options.size || 5) * 1000000;

        // Current Request
        const req = this.req;

        // Holds all files
        let $files: UploadedFile[] = [];

        /**
         * Populates body that comes with the request if $opts.includeBody === true
         * @type {{}}
         */
        let $body: Record<string, any> = {};

        try {
          /**
           * Initialize busboy
           *
           * passing req.headers and setting limits
           * @type {busboy.Busboy}
           */
          const busboy = new Busboy({
            headers: req["headers"] as BusboyHeaders,
            limits: {
              files: options.files,
              fileSize: options.size
            }
          });

          // On Busboy field event we validate incoming field.
          if (options.includeBody) {
            busboy.on("field", (key, val) => {
              $body[key] = val;
            });
          }

          const pendingFiles: Record<string, any> = {};

          function hasUploadedPendingFiles() {
            const values = Object.values(pendingFiles);
            return values.length && values.every((v) => v === true);
          }

          // On Busboy file event we validate incoming file.
          busboy.on("file", async (fieldname, file, filename, encoding, mimetype) => {
            /**
             * $data holds this process data.
             */
            let $data: FileData;

            // Trim Filename
            filename = String(filename).trim();

            // if for some reason uploaded file has no name.
            // Skip this file.
            if (!filename.length) return file.resume();

            // if not seen and fieldname matches the field we are looking for.
            if (!fields.includes(fieldname)) return file.resume();

            // if seen and fieldname matches the field we are looking for.

            let $ext = filename.split(".").pop()?.toLowerCase();

            // Set default data attributes.
            $data = {
              expectedField: fieldname,
              field: fieldname,
              name: filename,
              encoding,
              mimetype,
              size: 0
            };

            /**
             * Expected mimetype is the mimetype option set.
             *
             * The option expects a string to or a regex expression to test with.
             */
            let expectedMimetype = options.mimetype;
            if (
              options.mimetypeForEachField &&
              Object.keys(options.mimetypeForEachField).length &&
              options.mimetypeForEachField.hasOwnProperty(fieldname)
            ) {
              expectedMimetype = options.mimetypeForEachField[fieldname];
            }

            /**
             * check if mimetype is valid.
             *
             * By default it is false,
             * but if user did not define and mimetype rule it is set to true.
             *
             * @type {boolean}
             */
            let mimetypeIsValid = !expectedMimetype;

            if (!mimetypeIsValid) {
              /**
               * - Check if mimetype option is a regex expression
               * if true and regex test is true set mimetypeIsValid = true
               *
               * - else if mimetype option is a string we check if option is in mimetype
               * if true set mimetypeIsValid = true
               */
              if (expectedMimetype instanceof RegExp && expectedMimetype.test(mimetype)) {
                mimetypeIsValid = true;
              } else if (
                typeof expectedMimetype === "string" &&
                mimetype.includes(expectedMimetype)
              ) {
                mimetypeIsValid = true;
              }
            }

            /**
             * Check for expected extensions.
             *
             * if file extension using mimetype matches array of extensions provided.
             * @type {boolean}
             */
            let extensionIsValid;
            let expectedExtensions = options.extensions;
            if (
              options.extensionsForEachField &&
              Object.keys(options.extensionsForEachField).length &&
              options.extensionsForEachField.hasOwnProperty(fieldname)
            ) {
              expectedExtensions = options.extensionsForEachField[fieldname];
            }

            if (
              expectedExtensions &&
              Array.isArray(expectedExtensions) &&
              expectedExtensions.length
            ) {
              $data.expectedExtensions = expectedExtensions;

              const extByMimetype = $ext || false;
              extensionIsValid = !!(
                extByMimetype &&
                typeof extByMimetype === "string" &&
                expectedExtensions.includes(extByMimetype)
              );
            } else {
              extensionIsValid = true;
            }

            // if mimetype and extensions is valid, move file to temp folder.
            if (mimetypeIsValid && extensionIsValid) {
              // Create random file name.
              const tmpName = "xpresser_" + $.helpers.randomStr(50).toUpperCase();
              // Get OS tmpDir
              const saveTo = path.join(os.tmpdir(), tmpName);
              // Add tmpPath to $data
              $data.tmpPath = saveTo;

              // Create File Stream
              const stream = fs.createWriteStream(saveTo);
              file.pipe(stream);
              pendingFiles[saveTo] = false;

              /**
               * On Busboy file limit event we try to unpipe, destroy stream and unlink file.
               */
              file.on("limit", () => {
                $data.reachedLimit = true;
                delete pendingFiles[saveTo];
                $files.push(
                  new UploadedFile($data as FileData, {}, options.customErrors)
                );

                try {
                  // try unpipe and destroy steam.
                  file.unpipe();
                  stream.destroy();

                  // try un-linking file
                  fs.unlinkSync(saveTo);
                } catch (e) {
                  // do nothing but log error
                  $.logError(e);
                }

                file.resume();
              });

              stream.on("error", (e) => {
                reject(e);
              });

              /**
               * Push uploaded file when it has completely uploaded.
               */
              stream.on("finish", () => {
                $files.push(new UploadedFile($data, {}, options.customErrors));
                pendingFiles[saveTo] = true;

                if (hasUploadedPendingFiles()) {
                  resolve(new UploadedFiles(fields, $files, $body));
                }
              });
            } else {
              /**
               * If mimetype is not valid we set the expectedMimetype value
               * The File class records an error once this key is found.
               */
              if (!mimetypeIsValid) $data.expectedMimetype = expectedMimetype;

              /**
               * If extensions is not valid we set the expectedExtensions value
               * The File class records an error once this key is found.
               */
              if (!extensionIsValid) $data["expectedExtensions"] = expectedExtensions;

              // Push file data to files
              $files.push(new UploadedFile($data, {}, options.customErrors));

              // Resume file upload.
              file.resume();
            }
          });

          busboy.on("finish", () => {
            if (!Object.keys(pendingFiles).length) {
              resolve(new UploadedFiles(fields, $files, $body));
            }
          });
          // Pipe to request
          req.pipe(busboy);
        } catch (e) {
          reject(e);
        }
      });
    }
  };
};

/**
 * Declare Types
 */
declare module "xpresser/types/http" {
  interface Http {
    /**
     * Check if request if od type multipart/form-data"
     */
    isMultiPartFormData(): boolean;

    /**
     * Get Single Field
     * @param field
     * @param $options
     */
    file(field: string, $options?: SingleFileOptions): Promise<UploadedFile>;

    /**
     * Get Multiple Fields
     * @param field
     * @param $options
     */
    files(
      field: string | string[],
      $options?: MultipleFilesOptions
    ): Promise<UploadedFiles>;
  }
}
