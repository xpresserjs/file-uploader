import fs = require("fs");
import path = require("path");
import { CustomErrors, FileData, FileUploadError, SaveOptions } from "./types";

const PathHelper = require("xpresser/dist/src/Helpers/Path");

function setPrivately<S>(source: S, data: Record<string, any>, writable = true) {
  Object.entries(data).forEach(([key, value]) => {
    Object.defineProperty(source, key, {
      value,
      enumerable: false,
      writable
    });
  });
}

class UploadedFile {
  name: string;
  body: Record<string, any> = {};
  field: string;
  encoding: string;
  mimetype: string;
  size: number = 0;
  path?: string;
  tmpPath?: string;
  private readonly expectedField!: string;
  private readonly expectedMimetype?: string | RegExp;
  private readonly expectedExtensions!: string[];
  private readonly reachedLimit!: boolean;
  private cachedError?: FileUploadError;
  private stats = {
    copied: false,
    moved: false,
    movedTo: null as null | string,
    error: false as false | string
  };
  private customErrors?: CustomErrors;

  /**
   * Accept all needed data from file process
   * @param data
   * @param body
   * @param customErrors
   */
  constructor(data: FileData, body = {}, customErrors?: CustomErrors) {
    const extensions = data.expectedExtensions;

    this.field = data.field;
    this.name = data.name;
    this.tmpPath = data.tmpPath;
    this.encoding = data.encoding;
    this.mimetype = data.mimetype;
    this.size = data.size || 0;
    this.body = body;

    setPrivately(this, {
      stats: this.stats,
      customErrors,
      cachedError: this.cachedError,
      expectedField: data.expectedField,
      expectedMimetype: data.expectedMimetype,
      reachedLimit: data.reachedLimit || false,
      expectedExtensions: Array.isArray(extensions) && extensions.length ? extensions : []
    });

    if (!this.reachedLimit && this.tmpPath && fs.existsSync(this.tmpPath)) {
      try {
        const { size } = fs.statSync(this.tmpPath);
        this.size = size;
      } catch (e) {
        console.log(e);
      }
    }
  }

  /**
   * UploadedFile Error.
   *
   * Runs various checks on data provided to know if there are any errors.
   * If there are no errors `false` is returned.
   */
  error() {
    /**
     * If cachedError is not null then this instance has saved an error before.
     */
    if (this.cachedError) return this.cachedError;

    let error: FileUploadError | undefined = undefined;

    /**
     * --- Rules
     * 1. If expectedField and the field received is not the same
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
    if (this.expectedField !== this.field) {
      error = {
        type: "field",
        filename: this.name,
        field: this.expectedField,
        expected: this.expectedField,
        received: this.field,
        message: `Field: "${this.expectedField}" not found`
      };
    } else if (this.field && !this.name && !this.size) {
      error = {
        type: "file",
        field: this.field,
        filename: this.name,
        message: `No file found for input: ${this.field}`
      };
    } else if (this.reachedLimit) {
      error = {
        type: "size",
        field: this.field,
        filename: this.name,
        message: `File: "${this.name}" is too large.`
      };
    } else if (this.expectedMimetype) {
      error = {
        type: "mimetype",
        field: this.field,
        filename: this.name,
        expected: this.expectedMimetype,
        received: this.mimetype,
        message: `File: "${this.name}" mimetype does not match the expected mimetype: ${this.expectedMimetype}`
      };
    } else if (
      this.expectedExtensions.length &&
      !this.extensionMatch(this.expectedExtensions)
    ) {
      const received = this.extension();
      error = {
        type: "extension",
        field: this.field,
        filename: this.name,
        expected: this.expectedExtensions,
        received,
        message: `File: "${this.name}" has unsupported file extension`
      };
    }

    // Use defined error messages
    if (this.customErrors && error) {
      let customError = this.customErrors[error.type];

      if (typeof customError === "function") {
        customError = customError(error);
      }

      if (typeof customError === "string") {
        error.message = customError;
      }
    }

    // Cache error so this check does not have to re-run
    this.cachedError = error;

    // Return error
    return error;
  }

  /**
   * Get File Name without extension
   */
  nameWithoutExtension() {
    const parse = path.parse(this.name);
    return parse.name;
  }

  /**
   * Get extension using files mimetype.
   * Returns false if mimetype is not found.
   */
  extension() {
    return this.name.split(".").pop()!.toLowerCase();
  }

  /**
   * Same as extension but adds `.` before the required extension.
   *
   * E.g
   * file.extension() => 'png'
   * file.dotExtension() => '.png'
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
  extensionMatch($extension: string | string[]) {
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
  dotExtensionMatch($extension: string | string[]) {
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
  saveTo($folder: string, $opts: SaveOptions = {}) {
    return new Promise((resolve) => {
      // Set Default options
      $opts = {
        overwrite: true,
        prependExtension: false,
        ...$opts
      };

      /**
       * If tmpPath is defined, proceed else record a tmpPath not defined error.
       */
      if (this.tmpPath) {
        // Check if file exists in tmpPath
        if (!fs.existsSync(this.tmpPath)) {
          this.stats.error = "tmpPath file not found.";
          return resolve(false);
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

        const onCopyFile = (err: any) => {
          // Delete file from temp folder.
          this.discard();

          // Record error and return false.
          if (err) {
            this.stats.error = err.message;
            return resolve(false);
          }

          // set Path and set copied to true.
          this.stats.copied = true;
          this.path = filePath;
          this.name = fileName;

          return resolve(true);
        };

        if ($opts.overwrite) {
          // Copy UploadedFile to destination folder.
          fs.copyFile(this.tmpPath, filePath, onCopyFile);
        } else {
          flags = fs.constants.COPYFILE_EXCL;
          fs.copyFile(this.tmpPath, filePath, flags, onCopyFile);
        }
      } else {
        // Delete file from temp folder.
        this.discard();

        this.stats.error = "tmpPath not defined.";
        return resolve(false);
      }
    });
  }

  /**
   * Deletes From Temp Directory
   *
   * Should in any case, you no longer want to use uploaded file,
   * You can discard it.
   * @returns {boolean}
   */
  discard() {
    if (!this.tmpPath || this.stats.moved) return true;

    if (fs.existsSync(this.tmpPath)) {
      try {
        fs.unlinkSync(this.tmpPath);
        this.stats.moved = true;
        this.tmpPath = undefined;
      } catch (e) {
        this.stats.moved = false;
      }
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

export = UploadedFile;
