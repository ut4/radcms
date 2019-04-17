const {app} = require('../src/app.js');
const {webApp} = require('../src/web.js');
const {SiteGraph} = require('../src/website.js');
const {templateCache} = require('../src/templating.js');
const directives = require('../src/directives.js');

const testEnv = {
    setupAppDb() {
        app.initAndInstall({memory: true});
        this.setupAppDb = () => {};
    },
    setupTestWebsite() {
        app.setWaitingWebsite('dummy/', {memory: true});
        app.waitingWebsite.install(null);
        app.waitingWebsite.config._populateFrom({Site: {}});
        app.setCurrentWebsite(app.waitingWebsite.dirPath, true);
        this.setupTestWebsite = () => {};
    },
    setupDirectives() {
        directives.init();
        this.setupDirectives = () => {};
    }
};

app.log = () => {};

webApp.getHandler = function(url, method) {
    let fn;
    let l = this.routeMatchers.length;
    for (var i = 0; i < l; ++i) {
        if ((fn = this.routeMatchers[i](url, method))) return fn;
    }
    throw new Error('Didn\'t find handler for ' + method + ' ' + url);
};

webApp.makeRequest = function(path, method, data = {}) {
    return {path, method, params: {}, data};
};

webApp.makeResponse = function() {
    return {json: () => {}, plain: () => {}, send: () => {},
            beginChunked: () => {}, writeChunk: () => {}, endChunked: () => {}};
};

SiteGraph.prototype.clear = function() {
    this.pages = {};
    this.pageCount = 0;
};

templateCache.clear = () => {
    for (const key in templateCache._fns) {
        if (key.indexOf('Rad') != 0) templateCache.remove(key);
    }
};

function Stub(obj, method, withFn) {
    this.callInfo = [];
    let orig = obj[method];
    let self = this;
    obj[method] = function() {
        self.callInfo.push(arguments);
        if (withFn) return withFn.apply(obj, arguments);
    };
    this.restore = function() {
        obj[method] = orig;
    };
}

exports.Stub = Stub;
exports.testEnv = testEnv;
