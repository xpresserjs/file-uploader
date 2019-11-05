declare class UploadedFile {
    // File name
    name: string;
    // Input holding file.
    input: string;
    // File Encoding
    encoding: string;
    // File Mimetype
    mimetype: string;
    // File Size in bytes.
    size: number;
    // Expected input defined by user.
    expectedInput: string;
    // Path to saved filed..
    path: string;
    // Temp Path to file.
    tmpPath: string;
    // If file reached the max file size set.
    reachedLimit: boolean;


    /**
     * File Error.
     *
     * Runs various checks on data provided to know if there are any errors.
     * If there are no errors `false` is returned.
     */
    error(): { type: string, message: string, expected?: string, received?: string } | boolean;

    /**
     * Get extension using files mimetype.
     * Returns false if mimetype is not found.
     * @returns {string}
     */
    extension(): string;

    /**
     * Check if extension is string or is included array provided.
     *
     * e.g file.extensionMatch('png')
     * @param $extension
     */
    extensionMatch($extension: string | string[]): boolean;

    /**
     * Same as extension but adds `.` before the required extension.
     *
     * E.g
     * file.extension() => 'png'
     * file.dotExtension() => '.png'
     * @returns {string}
     */
    dotExtension(): string;

    /**
     * Check if dotExtension is string or is included array provided.
     *
     * e.g file.dotExtensionMatch('.png')
     * @param $extension
     */
    dotExtensionMatch($extension: string | string[]): boolean;

    /**
     * Save file to path.
     * must me used with await e.g
     *
     * await file.saveTo();
     *
     * Moves file from tmpPath to path specified.
     * Path specified will be created if not exists.
     *
     * @param $options
     * @returns {Promise<boolean>}
     */
    saveTo($options: {
        name?: string,
        overwrite?: boolean,
        prependExtension?: boolean,
    }): Promise<boolean>;

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
     * @param $options
     * @returns {Promise<boolean>}
     */
    saveTo($folder?: string, $options?: {
        name?: string,
        overwrite?: boolean,
        prependExtension?: boolean,
    }): Promise<boolean>;

    /**
     * Delete From Temp Directory
     *
     * Should in any case there was a file unlink error after saving
     * the temp file may still be in your temp folder.
     * This function deletes it.
     * @returns {boolean}
     */
    deleteFromTmpDir(): boolean;

    /**
     * isSaved.
     *
     * Check if file has been copied to the specified location.
     * @returns {boolean}
     */
    isSaved(): boolean;

    /**
     * isMoved
     *
     * Check if file has been deleted from tmpPath.
     * @returns {boolean}
     */
    isMoved(): boolean;

    /**
     * saveError
     *
     * Holds save error if any and returns false if none.
     * @returns {string|boolean}
     */
    saveError(): boolean | string;

    /**
     * Convert string to human readable text
     * e.g 1MB, 45GB
     * @param decimals
     * @returns {string}
     */
    sizeToString(decimals?: number): string;
}

declare namespace Xpresser {
    interface Http {
        /**
         * Get file from post request.
         * @return {Promise<UploadedFile>}
         */
        file(key: string, $options?: {
            size?: number,
            mimetype?: string | RegExp,
            extensions?: string[] | { accept?: string[], reject?: string[] }
        }): Promise<UploadedFile>
    }
}

export = Xpresser;
