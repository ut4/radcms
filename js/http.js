/**
 * @param {string} url
 * @param {string} method
 * @constructor
 */
exports.Request = function(url, method) {
    this.url = url;
    this.method = method;
    /* @native this.data = {} */
};
/**
 * @native
 * @param {string} name
 * @returns {string|null}
 */
exports.Request.prototype.getUrlParam = function(name) {};

/**
 * @param {number} statusCode
 * @param {string} body
 * @param {Object} headers
 * @constructor
 */
exports.Response = function(statusCode, body, headers) {
    if (statusCode < 100) {
        throw new TypeError('Not valid status code: ' + statusCode);
    }
    this.statusCode = statusCode;
    this.body = body || '';
    if (headers) {
       for (var key in headers) {
           if (typeof headers[key] != 'string')
               throw new TypeError('A header value must be a string.');
       }
       this.headers = headers;
    } else {
        this.headers = {};
    }
};

/**
 * @param {number} statusCode
 * @param {(): string} chunkFn
 * @param {any?} chunkFnState default null
 * @param {number?} chunkSizeMax default 512
 * @throws {TypeError}
 * @constructor
 */
exports.ChunkedResponse = function(statusCode, chunkFn, chunkFnState, chunkSizeMax) {
    if (statusCode < 100) {
        throw new TypeError('Not valid status code: ' + statusCode);
    }
    this.statusCode = statusCode;
    if (typeof chunkFn != 'function') {
        throw new TypeError('chunkFn not a function');
    }
    this.getNextChunk = chunkFn;
    this.chunkFnState = chunkFnState;
    this.chunkSizeMax = chunkSizeMax ? parseInt(chunkSizeMax) : 512;
    if (!this.chunkSizeMax || isNaN(this.chunkSizeMax)) {
        throw new TypeError('Invalid chunkSizeMax ' + this.chunkSizeMax);
    }
};