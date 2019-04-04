/**
 * # web.js
 *
 * This file contains the web app singleton, which also acts as a minimal
 * "routing framework".
 *
 * # Contents
 * ## NormalizedRequest: class
 * ## BasicResponse: class
 * ## ChunkedResponse: class
 * ## webApp: singleton
 * ### addRoute()
 *
 */
const parseUrl = require('url').parse;
const parseQ = require('querystring').parse;
const http = require('http');
const {app} = require('./app.js');

class NormalizedRequest {
    /**
     * @param {http.IncomingMessage} req
     */
    constructor(req) {
        this.method = req.method;
        this.url = req.url;
        this.path = parseUrl(req.url);
        this.params = this.path.query ? parseQ(this.path.query) : {};
        this.data = null;
    }
}

class BasicResponse {
    /**
     * @param {number} statusCode
     * @param {string|any[]} body eg. 'body' or [file, 'binary']
     * @param {Object?} headers = null
     */
    constructor(statusCode, body, headers) {
        this.statusCode = statusCode;
        this.body = body;
        if (headers) {
            for (let key in headers) {
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
    }
    /**
     * @param {http.ServerResponse} res
     */
    process(res) {
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
}

class ChunkedResponse {
    /**
     * @param {number} statusCode
     * @param {(state: any, (chunk: string): any): any} chunkProviderFn
     * @param {any} state
     */
    constructor(statusCode, chunkProviderFn, state) {
        this.statusCode = statusCode;
        this.chunkProviderFn = chunkProviderFn;
        this.state = state;
    }
    /**
     * @param {http.ServerResponse} res
     */
    process(res) {
        res.setHeader('Content-Type', 'text/plain; charset=UTF-8');
        res.writeHead(200);
        this._callNextChunk(res);
    }
    _callNextChunk(res) {
        this.chunkProviderFn(this.state, chunk => {
            if (chunk) {
                res.write(chunk);
                this._callNextChunk(res);
            } else {
                res.end();
            }
        });
    }
}

function makeJsonResponse(statusCode, obj) {
    return new BasicResponse(statusCode, JSON.stringify(obj),
        {'Content-Type': 'application/json'}
    );
}

const webApp = {
    /**
     * @property {(url: string, method: string): (myReq: NormalizedRequest, (myRes: BasicResponse|ChynkedResponse):|undefined): any}[]
     */
    routeMatchers: [],
    /**
     *
     */
    start() {
        http.createServer(this._handleRequest.bind(this)).listen(3000);
    },
    /**
     * @param {(url: string, method: string): (myReq: NormalizedRequest, (myRes: BasicResponse|ChynkedResponse):|undefined): any} fn
     */
    addRoute(fn) {
        this.routeMatchers.push(fn);
    },
    /**
     * @param {http.IncomingMessage} req
     * @param {http.ServerResponse} res
     */
    _handleRequest(req, res) {
        if (req.method === 'POST') {
            if (req.headers['content-type'] !== 'application/json') {
                new BasicResponse(400, 'Expected "content-type": "application/json"',
                                  {'Content-Type': 'text/plain'}).process(res);
                return;
            }
        }
        const myReq = new NormalizedRequest(req);
        // GET or DELETE -> call the matchers right away
        if (req.method === 'GET' || req.method === 'DELETE') {
            this._matchAndDispatchRequest(myReq, res);
        // POST or PUT -> collect the json data first before calling the matchers
        } else if (req.method === 'POST' || req.method === 'PUT') {
            let requestBody = '';
            req.on('data', chunk => { requestBody += chunk; });
            req.on('end', () => {
                try {
                    myReq.data = requestBody.length ? JSON.parse(requestBody) : {};
                    this._matchAndDispatchRequest(myReq, res);
                } catch (e) {
                    app.log('[Error]: ' + e.message);
                    new BasicResponse(400, 'Failed to parse json',
                                      {'Content-Type': 'text/plain'}).process(res);
                }
            });
        }
    },
    /**
     * @param {NormalizedRequest} myReq
     * @param {http.ServerResponse} res
     */
    async _matchAndDispatchRequest(myReq, res) {
        let handler = null;
        // Call the matchers until a handler is returned.
        const l = this.routeMatchers.length;
        for (let i = 0; i < l; ++i) {
            if ((handler = this.routeMatchers[i](myReq.url, myReq.method))) break;
        }
        // Got one -> call it.
        if (handler) {
            const myRes = await handler(myReq);
            if (myRes instanceof BasicResponse ||
                myRes instanceof ChunkedResponse) {
                myRes.process(res);
            } else {
                app.log('[Error]: Handler must return a BasicResponse or ChunkedResponse');
            }
            return;
        }
        // None of the matchers matched -> 404
        new BasicResponse(404, 'Not found', {'Content-Type': 'text/plain'}).process(res);
    }
};

exports.webApp = webApp;
exports.BasicResponse = BasicResponse;
exports.makeJsonResponse = makeJsonResponse;
exports.ChunkedResponse = ChunkedResponse;
