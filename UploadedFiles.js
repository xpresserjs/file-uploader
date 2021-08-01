class UploadedFiles {
  input = "";
  /**
   * Holds each UploadedFile
   * @type {UploadedFile[]}
   */
  files = [];

  constructor(input, files = [], body = {}) {
    if (!Array.isArray(files))
      throw TypeError(`UploadFiles expects files to be an Array`);

    this.input = input;
    this.files = files;
    this.body = body;
  }

  /**
   * Checks if this instance has any file.
   * @returns {boolean}
   */
  hasFiles() {
    return this.files.length > 0;
  }

  /**
   * Checks if any file has error.
   * @returns {boolean}
   */
  hasFilesWithErrors() {
    return this.files.some((file) => file.error());
  }

  /**
   * Checks if any file has error.
   * @returns {boolean}
   */
  hasFilesWithoutErrors() {
    return this.files.some((file) => !file.error());
  }

  /**
   * Returns Array of files with error.
   * @returns {UploadedFile[]}
   */
  filesWithError() {
    return this.files.filter((file) => file.error());
  }

  /**
   * Returns Array of files without error.
   * @returns {UploadedFile[]}
   */
  filesWithoutError() {
    return this.files.filter((file) => !file.error());
  }

  /**
   * Save files
   * @param $folder
   * @param $options
   */
  saveFiles($folder = undefined, $options = {}) {
    const folderIsFunction = typeof $folder === "function";
    const optionsIsFunction = typeof $options === "function";
    return new Promise((resolve, reject) => {
      const tasks = [];

      for (const file of this.filesWithoutError()) {
        try {
          const thisFolder = folderIsFunction ? $folder(file) : $folder;
          const thisOptions = optionsIsFunction ? $options(file) : $options;

          tasks.push(file.saveTo(thisFolder, thisOptions));
        } catch (e) {
          return reject(e);
        }
      }

      if (!tasks.length) return resolve(false);

      Promise.all(tasks)
        .then(() => resolve(true))
        .catch(reject);
    });
  }
}

UploadedFiles.prototype.body = {};

module.exports = UploadedFiles;
