/**
 * # web.js
 *
 * This file contains the web app singleton, which also acts as a minimal
 * "routing framework".
 *
 * # Contents
 * ## MyRequest: class
 * ## MyResponse: class
 * ## webApp: singleton
 * ### addRoute()
 *
 */
const parseUrl = require('url').parse;
const parseQ = require('querystring').parse;
const http = require('http');

class MyRequest {
    /**
     * @param {http.IncomingMessage} req
     */
    constructor(req) {
        this.method = req.method;
        this.url = parseUrl(req.url);
        this.path = this.url.pathname;
        this.params = this.url.query ? parseQ(this.url.query) : {};
        this.data = null;
    }
}

class MyResponse {
    /**
     * @param {http.ServerResponse} res
     */
    constructor(res) {
        this.res = res;
    }
    /**
     * Sends a json response to the browser.
     *
     * @param {number} statusCode
     * @param {Onject} obj
     */
    json(statusCode, obj) {
        this.send(statusCode, JSON.stringify(obj),
            {'Content-Type': 'application/json'});
    }
    /**
     * Sends a text/plain response to the browser.
     *
     * @param {number} statusCode
     * @param {string|any[]} body eg. 'body' or [file, 'binary']
     */
    plain(statusCode, body) {
        this.send(statusCode, body,
            {'Content-Type': 'text/plain'});
    }
    /**
     * Sends a response to the browser.
     *
     * @param {number} statusCode
     * @param {string|any[]} body eg. 'body' or [file, 'binary']
     * @param {string|Object?} headers = null
     */
    send(statusCode, body, headers) {
        this.statusCode = statusCode;
        this.body = body;
        if (headers) {
            for (const key in headers) {
                if (typeof headers[key] !== 'string')
                    throw new TypeError('A header value must be a string.');
            }
            this.headers = headers;
        } else {
            this.headers = {};
        }
        if (!this.headers['Content-Type']) {
            this.headers['Content-Type'] = 'text/html;charset=utf-8';
        }
        //
        const res = this.res;
        for (const key in this.headers) {
            res.setHeader(key, this.headers[key]);
        }
        res.writeHead(this.statusCode);
        if (typeof this.body === 'string')
            res.write(this.body);
        else
            res.write(...this.body);
        res.end();
    }
    /**
     * @param {number?} statusCode = 200
     */
    beginChunked(statusCode = 200) {
        this.res.setHeader('Content-Type', 'text/plain; charset=UTF-8');
        this.res.writeHead(statusCode);
    }
    /**
     * @param {any} chunk
     */
    writeChunk(chunk) {
        this.res.write(chunk);
    }
    endChunked() {
        this.res.end();
    }
}

const webApp = {
    /**
     * @property {Array<(url: string, method: string): (myReq: MyRequest, myRes: MyResponse): any>}
     */
    routeMatchers: [],
    /**
     *
     */
    start(onOk, onErr) {
        const server = http.createServer(this._handleRequest.bind(this));
        server.listen(3000);
        server.on('listening',  onOk);
        server.on('error', onErr);
    },
    /**
     * @param {(url: string, method: string): (myReq: MyRequest, myRes: MyResponse): any} fn
     */
    addRoute(fn) {
        this.routeMatchers.push(fn);
    },
    /**
     * @param {http.IncomingMessage} req
     * @param {http.ServerResponse} res
     */
    _handleRequest(req, res) {
        const myRes = new MyResponse(res);
        if (req.method === 'POST') {
            if (req.headers['content-type'] !== 'application/json') {
                myRes.plain(400, 'Expected "content-type": "application/json"');
                return;
            }
        }
        const myReq = new MyRequest(req);
        // GET or DELETE -> call the matchers right away
        if (req.method === 'GET' || req.method === 'DELETE') {
            this._matchAndDispatchRequest(myReq, myRes);
        // POST or PUT -> collect the json data first before calling the matchers
        } else if (req.method === 'POST' || req.method === 'PUT') {
            let requestBody = '';
            req.on('data', chunk => { requestBody += chunk; });
            req.on('end', () => {
                myReq.data = requestBody.length ? JSON.parse(requestBody) : {};
                this._matchAndDispatchRequest(myReq, myRes);
            });
        }
    },
    /**
     * @param {MyRequest} myReq
     * @param {MyResponse} myRes
     */
    _matchAndDispatchRequest(myReq, myRes) {
        let handler = null;
        // Call the matchers until a handler (function) is returned.
        const l = this.routeMatchers.length;
        for (let i = 0; i < l; ++i) {
            if ((handler = this.routeMatchers[i](myReq.path, myReq.method)))
                break;
        }
        // Got one -> call it and move on.
        if (handler) {
            handler(myReq, myRes);
            return;
        }
        // None of the matchers matched -> 404
        myRes.plain(404, 'Not found');
    }
};

exports.webApp = webApp;
