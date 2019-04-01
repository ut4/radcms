/**
 * # web.js
 *
 * This file contains the web app singleton, which also acts as a minimal
 * "routing framework".
 *
 * # Contents
 * ## NormalizedRequest()
 * ## BasicResponse()
 * ## ChunkedResponse()
 * ## webApp
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
        this.headers = headers || {};
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
                throw new Error('todo return 400');
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
                    myReq.data = JSON.parse(requestBody);
                    this._matchAndDispatchRequest(myReq, res);
                } catch (e) {
                    throw e;
                }
            });
        }
    },
    /**
     * @param {NormalizedRequest} myReq
     * @param {http.ServerResponse} res
     */
    _matchAndDispatchRequest(myReq, res) {
        const l = this.routeMatchers.length;
        for (let i = 0; i < l; ++i) {
            // Call the matcher function.
            const handler = this.routeMatchers[i](myReq.url, myReq.method);
            // Wasn't interested.
            if (!handler) continue;
            // Got a handler -> call it
            handler(myReq, myRes => {
                // Got a response
                if (myRes instanceof BasicResponse ||
                    myRes instanceof ChunkedResponse) {
                    myRes.process(res);
                } else {
                    app.log('[Error]: Handler must return a BasicResponse or ChunkedResponse');
                }
            });
            break;
        }
        // none of the matchers returned a function -> 404
        return new BasicResponse(200, 'Not found', {'Content-Type': 'text/plain'});
    }
};

exports.webApp = webApp;
exports.BasicResponse = BasicResponse;
exports.ChunkedResponse = ChunkedResponse;
