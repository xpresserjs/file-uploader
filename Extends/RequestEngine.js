const Busboy = require('busboy'),
    fs = require('fs'),
    os = require('os'),
    path = require('path'),
    File = require("../File");

module.exports = (RequestEngine) => {
    return class extends RequestEngine {
        file($key, $opts = {}) {
            $opts = Object.assign({
                size: 1
            }, $opts);


            // Convert to bytes.
            $opts['size'] = $opts['size'] * 1000000;

            const req = this.req;

            return new Promise((resolve, reject) => {

                if (req.method.toLowerCase() !== "post") {
                    return resolve(false);
                }

                try {
                    let data = false, $seen = false;
                    const busboy = new Busboy({
                        headers: req.headers,
                        limits: {
                            files: 1,
                            fileSize: $opts.size
                        }
                    });

                    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {

                        if (!$seen && fieldname === $key) {
                            $seen = true;
                            data = {
                                expectedInput: $key,
                                input: fieldname,
                                name: String(filename).trim().length ? filename : undefined,
                                encoding,
                                mimetype,
                            };

                            const tmpName = 'xpresser_' + $.helpers.randomStr(50).toUpperCase();
                            const saveTo = path.join(os.tmpdir(), tmpName);
                            data['tmpPath'] = saveTo;

                            const stream = fs.createWriteStream(saveTo);
                            file.pipe(stream);

                            file.on('limit', () => {
                                data["reachedLimit"] = true;

                                // Unpipe and destroy steam.
                                file.unpipe();
                                stream.destroy();

                                // try un-linking file
                                try {
                                    fs.unlinkSync(saveTo);
                                } catch (e) {
                                    // do nothing but log error
                                    $.logError(e);
                                }

                                file.resume();
                            });

                            file.on('data', ($data) => {
                                data['size'] = $data.length;
                            });
                        } else {
                            file.resume()
                        }
                    });

                    busboy.on('finish', () => {
                        if (typeof data === 'object') {
                            resolve(new File(data));
                        } else {
                            resolve(new File({
                                expectedInput: $key
                            }));
                        }
                    });

                    req.pipe(busboy);
                } catch (e) {
                    reject(e);
                }
            });
        }
    }
};
