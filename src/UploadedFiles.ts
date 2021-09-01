import UploadedFile from "./UploadedFile";
import {
  FunctionThatReturnsSaveOptions,
  FunctionThatReturnsString,
  SaveOptions
} from "./types";

class UploadedFiles {
  body: Record<string, any> = {};
  input: string | string[];
  /**
   * Holds each UploadedFile
   */
  files: UploadedFile[] = [];

  constructor(
    input: string | string[],
    files: UploadedFile[] = [],
    body: Record<string, any> = {}
  ) {
    if (!Array.isArray(files))
      throw TypeError(`UploadFiles expects files to be an Array`);

    this.input = input;
    this.files = files;
    this.body = body;
  }

  /**
   * Checks if this instance has any file.
   */
  hasFiles() {
    return this.files.length > 0;
  }

  /**
   * Checks if any file has error.
   */
  hasFilesWithErrors() {
    return this.files.some((file) => file.error());
  }

  /**
   * Checks if any file has error.
   */
  hasFilesWithoutErrors() {
    return this.files.some((file) => !file.error());
  }

  /**
   * Returns Array of files with error.
   */
  filesWithError() {
    return this.files.filter((file) => file.error());
  }

  /**
   * Returns Array of files without error.
   */
  filesWithoutError() {
    return this.files.filter((file) => !file.error());
  }

  /**
   * Save files
   * @param $folder
   * @param $options
   */
  saveFiles(
    $folder: string | FunctionThatReturnsString<UploadedFile>,
    $options?: SaveOptions | FunctionThatReturnsSaveOptions<UploadedFile>
  ) {
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

  /**
   * Discards files with Errors
   */
  discardFilesWithError() {
    this.filesWithError().forEach((f) => f.discard());
    return this;
  }

  /**
   * Discards files with Errors
   */
  discardTempFiles() {
    this.files.forEach((f) => f.discard());
    return this;
  }
}

export = UploadedFiles;
