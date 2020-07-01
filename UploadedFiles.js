class UploadedFiles {
    input = "";
    /**
     * Holds each UploadedFile
     * @type {UploadedFile[]}
     */
    files = [];

    constructor(input, files = [], body= {}) {
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
        return this.files.length > 0
    }

    /**
     * Checks if any file has error.
     * @returns {boolean}
     */
    hasFilesWithErrors() {
        for (const file of this.files) {
            if (file.error())
                return true
        }

        return false
    }

    /**
     * Returns Array of files with error.
     * @returns {UploadedFile[]}
     */
    filesWithError() {
        const filesWithError = [];

        for (const file of this.files) {
            if (file.error())
                filesWithError.push(file);
        }

        return filesWithError;
    }

    /**
     * Save files
     * @param $folder
     * @param $options
     */
    saveFiles($folder = undefined, $options = {}) {
        const folderIsFunction = typeof $folder === "function";
        const optionsIsFunction = typeof $options === "function";

        return new Promise(async (resolve, reject) => {
            for (const file of this.files) {
                if (!file.error()) {
                    try {
                        const thisFolder = folderIsFunction ? $folder(file) : $folder;
                        const thisOptions = optionsIsFunction ? $options(file) : $options;

                        await file.saveTo(thisFolder, thisOptions);
                    } catch (e) {
                        return reject(e);
                    }
                }
            }

            return resolve(true);
        });
    }
}

UploadedFiles.prototype.body = {}

module.exports = UploadedFiles;