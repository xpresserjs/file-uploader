const Busboy = require('busboy');
const fs = require('fs');
const os = require('os');
const path = require('path');
const UploadedFile = require("../UploadedFile");
const UploadedFiles = require("../UploadedFiles");
const mime2ext = require("../mime2ext");

/**
 * RequestEngine Extender
 * @param RequestEngine
 */
module.exports = (RequestEngine) => {
    return class extends RequestEngine {
        /**
         * Single File Upload
         * @param $key
         * @param $opts
         * @returns {Promise<UploadedFile>}
         */
        file($key, $opts = {}) {

            // Assign default option values.
            $opts = Object.assign({
                size: 10,
                mimetype: false,
                includeBody: true,
                extensions: false
            }, $opts);


            // Convert to bytes.
            $opts['size'] = $opts['size'] * 1000000;

            // Current Request
            const req = this.req;

            return new Promise((resolve, reject) => {

                try {
                    /**
                     * $data holds this process data.
                     * @type {object|boolean}
                     */
                    let $data = false;
                    /**
                     * $seen checks if field has been found to stop process once it is
                     * @type {boolean}
                     */
                    let $seen = false;

                    /**
                     * Populates body that comes with the request if $opts.includeBody === true
                     * @type {{}}
                     */
                    let body = {};

                    /**
                     * Initialize busboy
                     *
                     * passing req.headers and setting limits
                     * @type {Busboy}
                     */
                    const busboy = new Busboy({
                        headers: req["headers"],
                        limits: {
                            files: 1,
                            fileSize: $opts.size
                        }
                    });


                    // On Busboy field event we validate incoming field.
                    if ($opts.includeBody) {
                        busboy.on('field', (key, val) => {
                            body[key] = val;
                        })
                    }


                    // On Busboy file event we validate incoming file.
                    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {

                        // if seen and fieldname matches the field we are looking for.
                        if (!$seen && fieldname === $key) {
                            // Set seen to true, so if another file event is received it will be ignored.
                            $seen = true;

                            // Set default data attributes.
                            $data = {
                                expectedInput: $key,
                                input: fieldname,
                                name: String(filename).trim().length ? filename : undefined,
                                encoding,
                                mimetype,
                                size: 0
                            };

                            /**
                             * check if mimetype is valid.
                             *
                             * By default it is false,
                             * but if user did not define and mimetype rule it is set to true.
                             *
                             * @type {boolean}
                             */
                            let mimeTypeIsValid = false;

                            /**
                             * Expected mimetype is the mimetype option set.
                             *
                             * The option expects a string to or a regex expression to test with.
                             * @type {string|RegExp}
                             */
                            const expectedMimeType = $opts.mimetype;

                            if (expectedMimeType) {

                                /**
                                 * - Check if mimetype option is a regex expression
                                 * if true and regex test is true set mimeTypeIsValid = true
                                 *
                                 * - else if mimetype option is a string we check if option is in mimetype
                                 * if true set mimeTypeIsValid = true
                                 */
                                if (expectedMimeType instanceof RegExp && expectedMimeType.test(mimetype)) {
                                    mimeTypeIsValid = true;
                                } else if (typeof expectedMimeType === 'string' && mimetype.includes(expectedMimeType)) {
                                    mimeTypeIsValid = true;
                                }
                            } else {
                                mimeTypeIsValid = true;
                            }

                            /**
                             * Check for expected extensions.
                             *
                             * if file extension using mimetype matches array of extensions provided.
                             * @type {boolean}
                             */
                            let extensionIsValid = false;
                            const expectedExtensions = $opts.extensions;

                            if (expectedExtensions && Array.isArray(expectedExtensions) && expectedExtensions.length) {
                                $data['expectedExtensions'] = expectedExtensions;
                                const extByMimetype = mime2ext[mimetype] || false;
                                extensionIsValid = !!(extByMimetype && expectedExtensions.includes(extByMimetype));
                            } else {
                                extensionIsValid = true;
                            }


                            // if mimetype and extensions is valid, move file to temp folder.
                            if (mimeTypeIsValid && extensionIsValid) {
                                // Create random file name.
                                const tmpName = 'xpresser_' + $.helpers.randomStr(50).toUpperCase();
                                // Get OS tmpDir
                                const saveTo = path.join(os.tmpdir(), tmpName);
                                // Add tmpPath to $data
                                $data['tmpPath'] = saveTo;

                                // Create File Stream
                                const stream = fs.createWriteStream(saveTo);
                                file.pipe(stream);

                                /**
                                 * On Busboy file limit event we try to unpipe, destroy stream and unlink file.
                                 */
                                file.on('limit', () => {
                                    $data["reachedLimit"] = true;

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

                                // Update size on each data event received
                                file.on('data', (data) => {
                                    $data['size'] = data.length;
                                });
                            } else {
                                /**
                                 * If mimetype is not valid we set the expectedMimetype value
                                 * The File class records an error once this key is found.
                                 */
                                if (!mimeTypeIsValid)
                                    $data['expectedMimetype'] = String($opts.mimetype);

                                /**
                                 * If extensions is not valid we set the expectedExtensions value
                                 * The File class records an error once this key is found.
                                 */
                                if (!extensionIsValid)
                                    $data['expectedExtensions'] = expectedExtensions;

                                // Resume file upload.
                                file.resume();
                            }

                        } else {
                            file.resume()
                        }
                    });

                    // On Busboy finish we return UploadedFile
                    busboy.on('finish', () => {
                        if (typeof $data === 'object') {
                            resolve(new UploadedFile($data, body));
                        } else {
                            /**
                             * Else if no $data then we did not find the input the user defined.
                             * The add the expectedInput key, The File class records an error once this key is found.
                             */
                            resolve(new UploadedFile({
                                expectedInput: $key
                            }, body));
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
         * @param $key
         * @param $opts
         * @returns {Promise<UploadedFiles>}
         */
        files($key, $opts = {}) {

            const keyIsArray = Array.isArray($key);

            // Assign default option values.
            $opts = Object.assign({
                files: undefined,
                size: 10,
                mimetype: false,
                extensions: false,
                includeBody: true,
                mimeTypeForEachField: {},
                extensionsForEachField: {}
            }, $opts);


            // Convert to bytes.
            $opts['size'] = $opts['size'] * 1000000;

            // Current Request
            const req = this.req;


            return new Promise((resolve, reject) => {
                let files = [];

                /**
                 * Populates body that comes with the request if $opts.includeBody === true
                 * @type {{}}
                 */
                let body = {};

                try {
                    /**
                     * Initialize busboy
                     *
                     * passing req.headers and setting limits
                     * @type {Busboy}
                     */
                    const busboy = new Busboy({
                        headers: req["headers"],
                        limits: {
                            files: $opts.files,
                            fileSize: $opts.size
                        }
                    });


                    // On Busboy field event we validate incoming field.
                    if ($opts.includeBody) {
                        busboy.on('field', (key, val) => {
                            body[key] = val;
                        })
                    }

                    // On Busboy file event we validate incoming file.
                    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
                        /**
                         * $data holds this process data.
                         * @type {object|boolean}
                         */
                        let $data = false;

                        // Trim Filename
                        filename = String(filename).trim();
                        filename = filename.length ? filename : undefined;


                        // if seen and fieldname matches the field we are looking for.
                        if ((fieldname === $key || (keyIsArray && $key.includes(fieldname))) && filename) {
                            // Set default data attributes.
                            $data = {
                                expectedInput: fieldname,
                                input: fieldname,
                                name: String(filename).trim().length ? filename : undefined,
                                encoding,
                                mimetype,
                                size: 0
                            };

                            /**
                             * check if mimetype is valid.
                             *
                             * By default it is false,
                             * but if user did not define and mimetype rule it is set to true.
                             *
                             * @type {boolean}
                             */
                            let mimeTypeIsValid = false;

                            /**
                             * Expected mimetype is the mimetype option set.
                             *
                             * The option expects a string to or a regex expression to test with.
                             * @type {string|RegExp}
                             */
                            let expectedMimeType = $opts.mimetype;
                            if (Object.keys($opts.mimeTypeForEachField).length && $opts.mimeTypeForEachField.hasOwnProperty(fieldname)) {
                                expectedMimeType = $opts.mimeTypeForEachField[fieldname];
                            }

                            if (expectedMimeType) {

                                /**
                                 * - Check if mimetype option is a regex expression
                                 * if true and regex test is true set mimeTypeIsValid = true
                                 *
                                 * - else if mimetype option is a string we check if option is in mimetype
                                 * if true set mimeTypeIsValid = true
                                 */
                                if (expectedMimeType instanceof RegExp && expectedMimeType.test(mimetype)) {
                                    mimeTypeIsValid = true;
                                } else if (typeof expectedMimeType === 'string' && mimetype.includes(expectedMimeType)) {
                                    mimeTypeIsValid = true;
                                }
                            } else {
                                mimeTypeIsValid = true;
                            }

                            /**
                             * Check for expected extensions.
                             *
                             * if file extension using mimetype matches array of extensions provided.
                             * @type {boolean}
                             */
                            let extensionIsValid;
                            let expectedExtensions = $opts.extensions;
                            if (Object.keys($opts.extensionsForEachField).length && $opts.extensionsForEachField.hasOwnProperty(fieldname)) {
                                expectedExtensions = $opts.extensionsForEachField[fieldname];
                            }

                            if (expectedExtensions && Array.isArray(expectedExtensions) && expectedExtensions.length) {
                                $data['expectedExtensions'] = expectedExtensions;
                                const extByMimetype = mime2ext[mimetype] || false;
                                extensionIsValid = !!(extByMimetype && expectedExtensions.includes(extByMimetype));
                            } else {
                                extensionIsValid = true;
                            }


                            // if mimetype and extensions is valid, move file to temp folder.
                            if (mimeTypeIsValid && extensionIsValid) {
                                // Create random file name.
                                const tmpName = 'xpresser_' + $.helpers.randomStr(50).toUpperCase();
                                // Get OS tmpDir
                                const saveTo = path.join(os.tmpdir(), tmpName);
                                // Add tmpPath to $data
                                $data['tmpPath'] = saveTo;

                                // Create File Stream
                                const stream = fs.createWriteStream(saveTo);
                                file.pipe(stream);

                                /**
                                 * On Busboy file limit event we try to unpipe, destroy stream and unlink file.
                                 */
                                file.on('limit', () => {
                                    $data["reachedLimit"] = true;

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

                                // Update size on each data event received
                                file.on('data', (data) => {
                                    $data['size'] = data.length;
                                });

                                // On end add UploadedFile to files array
                                file.on('end', () => {
                                    files.push(new UploadedFile($data));
                                });
                            } else {
                                /**
                                 * If mimetype is not valid we set the expectedMimetype value
                                 * The File class records an error once this key is found.
                                 */
                                if (!mimeTypeIsValid)
                                    $data['expectedMimetype'] = expectedMimeType;

                                /**
                                 * If extensions is not valid we set the expectedExtensions value
                                 * The File class records an error once this key is found.
                                 */
                                if (!extensionIsValid)
                                    $data['expectedExtensions'] = expectedExtensions;

                                // Push file data to files
                                files.push(new UploadedFile($data));

                                // Resume file upload.
                                file.resume();
                            }
                        } else {
                            file.resume()
                        }
                    });

                    // On Busboy finish we return UploadedFile
                    busboy.on('finish', () => resolve(new UploadedFiles($key, files, body)));

                    // Pipe to request
                    req.pipe(busboy);
                } catch (e) {
                    reject(e);
                }
            });
        }
    }
};
