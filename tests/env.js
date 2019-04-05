const {app} = require('../src/app.js');
const {webApp} = require('../src/web.js');
const {SiteGraph} = require('../src/website.js');

const testEnv = {
    setupAppDb() {
        app.initAndInstall({memory: true});
        this.setupAppDb = () => {};
    },
    setupTestWebsite() {
        app.setWaitingWebsite('dummy/', {memory: true});
        app.waitingWebsite.install(null);
        app.setCurrentWebsite(app.waitingWebsite.dirPath, true);
        this.setupTestWebsite = () => {};
    }
};

webApp.getHandler = function(url, method) {
    let fn;
    let l = this.routeMatchers.length;
    for (var i = 0; i < l; ++i) {
        if ((fn = this.routeMatchers[i](url, method))) return fn;
    }
    throw new Error('Didn\'t find handler for ' + method + ' ' + url);
};

webApp.makeRequest = function(url, method, data = {}) {
    return {url, method, params: {}, data};
};

webApp.makeResponse = function() {
    return {json: () => {}, plain: () => {}, send: () => {},
            beginChunked: () => {}, writeChunk: () => {}, endChunked: () => {}};
};

SiteGraph.prototype.clear = function() {
    this.pages = {};
    this.pageCount = 0;
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
