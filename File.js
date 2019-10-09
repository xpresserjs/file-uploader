const fs = require('fs');
const path = require('path');
const PathHelper = require('xpresser/dist/src/Helpers/Path');

/**
 * Mime2ext
 * A json file with over 500+ mimetypes matching their various extensions.
 */
const mime2ext = require('./mime2ext');


class File {
    /**
     * Accept all needed data from file process
     * @param {object} data
     */
    constructor(data) {
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
        this.reachedLimit = data.reachedLimit || false;
    }

    /**
     * File Error.
     *
     * Runs various checks on data provided to know if there are any errors.
     * If there are no errors `false` is returned.
     * @returns {string|boolean}
     */
    error() {

        /**
         * --- Rules
         * 1. If expectedInput and the input received is not the same
         * we record an Input not found error.
         *
         * 2. if no file is received, busboy returns and empty name and size.
         * so we check if name and size is undefined, if true,
         * we record a No file found error.
         *
         * 3. if file reached the set file size limit,
         * we record a file limit error.
         */

        if (this.expectedInput !== this.input) {
            return `Input not found: ${this.expectedInput}`
        } else if (this.input && !this.name && !this.size) {
            return `No file found for input: ${this.input}`
        } else if (this.reachedLimit) {
            return `File too large!`
        }

        return false;
    }

    /**
     * Get extension using files mimetype.
     * Returns false if mimetype is not found.
     * @returns {*|boolean}
     */
    extension() {
        return mime2ext[this.mimetype] || false;
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
        const mime = this.extension();
        if (mime) return '.' + mime;
        return false;

    }

    /**
     * Check if extension is string or is included array provided.
     *
     * e.g file.extensionMatch('png')
     * @param $extension
     */
    extensionMatch($extension) {
        if (typeof $extension === 'string') {
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
        if (typeof $extension === 'string') {
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

        // If type $folder is object we assume is the option that is being passed.
        if (typeof $folder === "object") {
            $opts = $folder;
            $folder = undefined;
        }

        // Set Default options
        $opts = Object.assign({
            name: undefined,
            overwrite: true,
            prependExtension: false,
        }, $opts);


        return new Promise((resolve) => {
            /**
             * If tmpPath is defined, proceed else record a tmpPath not defined error.
             */
            if (this.tmpPath) {

                // Check if file exists in tmpPath
                if (!fs.existsSync(this.tmpPath)) {
                    this.stats.error = 'tmpPath file not found.';
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

                // Copy File to destination folder.
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
                this.stats.error = 'tmpPath not defined.';
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
    sizeToString(decimals=0) {
        const bytes = this.size;
        if (bytes === 0) return '0Bytes';

        const k = 1024,
            dm = decimals <= 0 ? 0 : decimals || 2,
            sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
            i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + sizes[i];
    }
}

File.prototype.name = undefined;
File.prototype.input = undefined;
File.prototype.encoding = undefined;
File.prototype.mimetype = undefined;
File.prototype.size = 0;
File.prototype.expectedInput = undefined;
File.prototype.path = undefined;
File.prototype.tmpPath = undefined;
File.prototype.reachedLimit = false;
File.prototype.stats = {
    copied: false,
    moved: false,
    movedTo: null,
    error: false
};

module.exports = File;
