const fs = require("fs");
const path = require("path");
const PathHelper = require("xpresser/dist/src/Helpers/Path");

/**
 * Mime2ext
 * A json file with over 500+ mimetypes matching their various extensions.
 */
const mime2ext = require("./mime2ext");

class UploadedFile {
  /**
   * Accept all needed data from file process
   * @param {object} data
   * @param body
   */
  constructor(data, body = {}) {
    const extensions = data.expectedExtensions;

    if (typeof data.input === "string" && data.input.length) {
      this.input = data.input;
    }

    if (typeof data.name === "string" && data.name.length) {
      this.name = data.name;
    }

    this.tmpPath = data.tmpPath || undefined;
    this.encoding = data.encoding || undefined;
    this.mimetype = data.mimetype || undefined;
    this.size = data.size || 0;
    this.expectedInput = data.expectedInput || undefined;
    this.expectedMimetype = data.expectedMimetype || undefined;
    this.expectedExtensions =
      Array.isArray(extensions) && extensions.length ? extensions : [];
    this.reachedLimit = data.reachedLimit || false;
    this.body = body;

    if (!this.reachedLimit && this.tmpPath && fs.existsSync(this.tmpPath)) {
      try {
        const { size } = fs.statSync(this.tmpPath);
        this.size = size;
      } catch (e) {
        return console.log(e);
      }
    }
  }

  /**
   * UploadedFile Error.
   *
   * Runs various checks on data provided to know if there are any errors.
   * If there are no errors `false` is returned.
   * @returns {{expected: *, received: *, type: string, message: string}|{expected: *, received: Object.input, type: string, message: string}|{type: string, message: string}|boolean}
   */
  error() {
    /**
     * If cachedError is not null then this instance has saved an error before.
     */
    if (this.cachedError !== null) return this.cachedError;

    let error = false;
    /**
     * --- Rules
     * 1. If expectedInput and the input received is not the same
     * we record an Input not found error.
     *
     * 2. if no file is received, busboy returns  empty name and size.
     * so we check if name and size is undefined, if true,
     * we record a No file found error.
     *
     * 3. if file reached the set file size limit,
     * we record a file limit error.
     *
     * 4. if expectedMimetype exits it means that the file did not meet
     * the mimetype rule set by the user.
     *
     * 5. if expectedExtensions does not match extension,
     * we record Unsupported file extension error
     */
    if (this.expectedInput !== this.input) {
      error = {
        type: "input",
        expected: this.expectedInput,
        received: this.input,
        message: `Input not found: ${this.expectedInput}`
      };
    } else if (this.input && !this.name && !this.size) {
      error = {
        type: "file",
        message: `No file found for input: ${this.input}`
      };
    } else if (this.reachedLimit) {
      error = {
        type: "size",
        message: `File too large.`
      };
    } else if (this.expectedMimetype) {
      error = {
        type: "mimetype",
        expected: this.expectedMimetype,
        received: this.mimetype,
        message: `Expected mimetype does not match file mimetype: ${this.mimetype}`
      };
    } else if (
      this.expectedExtensions.length &&
      !this.extensionMatch(this.expectedExtensions)
    ) {
      const received = this.extension();
      error = {
        type: "extensions",
        expected: this.expectedExtensions,
        received,
        message: `Unsupported file extension: ${received}`
      };
    }

    // Cache error so this check does not have to re-run
    this.cachedError = error;

    // Return error
    return error;
  }

  /**
   * Get extension using files mimetype.
   * Returns false if mimetype is not found.
   * @returns {*|boolean}
   */
  extension() {
    return mime2ext[this.mimetype] || this.name.split(".").pop();
  }

  /**
   * Same as extension but adds `.` before the required extension.
   *
   * E.g
   * file.extension() => 'png'
   * file.dotExtension() => '.png'
   * @returns {string|boolean}
   */
  dotExtension() {
    /**
     * Get Extension,
     * Append '.' to mine if mine !== false
     * else return false.
     */
    return "." + this.extension();
  }

  /**
   * Check if extension is string or is included array provided.
   *
   * e.g file.extensionMatch('png')
   * @param $extension
   */
  extensionMatch($extension) {
    if (typeof $extension === "string") {
      return $extension === this.extension();
    } else if (Array.isArray($extension)) {
      return $extension.includes(this.extension());
    }

    return false;
  }

  /**
   * Check if dotExtension is string or is included array provided.
   *
   * e.g file.dotExtensionMatch('.png')
   * @param $extension
   */
  dotExtensionMatch($extension) {
    if (typeof $extension === "string") {
      return $extension === this.dotExtension();
    } else if (Array.isArray($extension)) {
      return $extension.includes(this.dotExtension());
    }
    return false;
  }

  /**
   * Save file to path.
   * must me used with await e.g
   *
   * await file.saveTo();
   *
   * Moves file from tmpPath to path specified.
   * Path specified will be created if not exists.
   *
   * @param $folder
   * @param $opts
   * @returns {Promise<boolean>}
   */
  saveTo($folder = undefined, $opts = {}) {
    const $ = global["xpresserInstance"]();

    // If type $folder is object we assume is the option that is being passed.
    if (typeof $folder === "object") {
      $opts = $folder;
      $folder = undefined;
    }

    // Set Default options
    $opts = Object.assign(
      {
        name: undefined,
        overwrite: true,
        prependExtension: false
      },
      $opts
    );

    return new Promise((resolve) => {
      /**
       * If tmpPath is defined, proceed else record a tmpPath not defined error.
       */
      if (this.tmpPath) {
        // Check if file exists in tmpPath
        if (!fs.existsSync(this.tmpPath)) {
          this.stats.error = "tmpPath file not found.";
          return resolve(false);
        }

        // Set default path to xpresser storage folder if $folder is undefined
        if ($folder === undefined) {
          $folder = $.path.storage();
        }

        let fileName = this.name;

        /**
         * Check if user has name defined in options.
         *
         * if true, we also check the length and prepend extension to file name.
         * if prependExtension = true in options
         */
        if ($opts.name) {
          $opts.name = String($opts.name);

          if (String($opts.name).length) {
            if ($opts.prependExtension) {
              fileName = $opts.name + this.dotExtension();
            } else {
              fileName = $opts.name;
            }
          }
        }

        const filePath = path.resolve($folder, fileName);

        // Make destination folder if not exists.
        PathHelper.makeDirIfNotExist(filePath, true);

        let flags = null;

        if (!$opts.overwrite) {
          flags = fs.constants.COPYFILE_EXCL;
        }

        // Copy UploadedFile to destination folder.
        fs.copyFile(this.tmpPath, filePath, flags, (err) => {
          // Record error and return false.
          if (err) {
            this.stats.error = err.message;
            return resolve(false);
          }

          // set Path and set copied to true.
          this.stats.copied = true;
          this.path = filePath;
          this.name = fileName;

          // Delete file from temp folder.
          this.deleteFromTmpDir();

          return resolve(true);
        });
      } else {
        this.stats.error = "tmpPath not defined.";
        return resolve(false);
      }
    });
  }

  /**
   * Delete From Temp Directory
   *
   * Should in any case there was a file unlink error after saving
   * the temp file may still be in your temp folder.
   * This function deletes it.
   * @returns {boolean}
   */
  deleteFromTmpDir() {
    if (fs.existsSync(this.tmpPath)) {
      try {
        fs.unlinkSync(this.tmpPath);
        this.stats.moved = true;
      } catch (e) {
        this.stats.moved = false;
      }
    } else {
      this.stats.moved = true;
    }

    return this.stats.moved;
  }

  /**
   * isSaved.
   *
   * Check if file has been copied to the specified location.
   * @returns {boolean}
   */
  isSaved() {
    return this.stats.copied;
  }

  /**
   * isMoved
   *
   * Check if file has been deleted from tmpPath.
   * @returns {boolean}
   */
  isMoved() {
    return this.stats.moved;
  }

  /**
   * saveError
   *
   * Holds save error if any and returns false if none.
   * @returns {string|boolean}
   */
  saveError() {
    return this.stats.error;
  }

  /**
   * Convert string to human readable text
   * e.g 1MB, 45GB
   * @param decimals
   * @returns {string|*}
   */
  sizeToString(decimals = 0) {
    const bytes = this.size;
    if (bytes === 0) return "0Bytes";

    const k = 1024;
    const dm = decimals <= 0 ? 0 : decimals || 2;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + sizes[i];
  }
}

UploadedFile.prototype.name = undefined;
UploadedFile.prototype.body = {};
UploadedFile.prototype.input = undefined;
UploadedFile.prototype.encoding = undefined;
UploadedFile.prototype.mimetype = undefined;
UploadedFile.prototype.size = 0;
UploadedFile.prototype.expectedInput = undefined;
UploadedFile.prototype.expectedMimetype = undefined;
UploadedFile.prototype.expectedExtensions = [];
UploadedFile.prototype.path = undefined;
UploadedFile.prototype.tmpPath = undefined;
UploadedFile.prototype.reachedLimit = false;
UploadedFile.prototype.stats = {
  copied: false,
  moved: false,
  movedTo: null,
  error: false
};
UploadedFile.prototype.cachedError = null;

module.exports = UploadedFile;
