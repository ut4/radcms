/**
 * @param {number} statusCode
 * @param {string} body
 * @param {headers} statusCode
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