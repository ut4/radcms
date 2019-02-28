var commons = require('common-services.js');
var documentData = require('document-data.js');
var crypto = require('crypto.js');

// == Page ====
// =============================================================================
/**
 * @param {string} url '/foo' or '/foo/page/2'
 * @param {string} parentUrl
 * @param {string} layoutFileName
 * @param {Object?} linksTo = {} A map of outbound urls
 * @param {number?} refCount = 0 The amount of places this page is (referenced from / linked to)
 * @constructor
 */
function Page(url, parentUrl, layoutFileName, linksTo, refCount) {
    this.url = url;
    this.urlPcs = url.split('/').slice(1); // ['', 'foo'] -> ['foo']
    this.parentUrl = parentUrl;
    this.layoutFileName = layoutFileName;
    this.linksTo = linksTo || {};
    this.refCount = refCount || 0;
}
/**
 * @param {Object?} dataToFrontend
 * @param {Array?} issues
 * @returns {string}
 */
Page.prototype.render = function(dataToFrontend, issues) {
    if (!commons.templateCache.has(this.layoutFileName)) {
        var message = 'The layout file \'' + this.layoutFileName +
            '\' doesn\'t exist yet, or is empty.';
        if (issues) issues.push(this.url + '>' + message);
        return '<html><body>' + message + '</body></html>';
    }
    var domTree = new commons.DomTree();
    domTree.directives = commons.templateCache._fns;
    domTree.setContext({currentPage: this});
    var props = {ddc: new documentData.DDC(commons.db), url: this.urlPcs};
    if (!dataToFrontend) {
        return domTree.render(commons.templateCache.get(this.layoutFileName)(domTree, props));
    }
    var html = domTree.render(commons.templateCache.get(this.layoutFileName)(domTree, props));
    dataToFrontend.allContentNodes = props.ddc.data;
    domTree.getRenderedFnComponents().forEach(function(fnCmp) {
        if (fnCmp.fn == commons.templateCache.get('RadArticleList')) {
            dataToFrontend.directiveInstances.push(
                {type: 'ArticleList', contentNodes: fnCmp.props.articles}
            );
        }
    });
    return html;
};
/**
 * @returns {DomTree}
 */
Page.prototype.dryRun = function() {
    var out = {domTree: new commons.DomTree(), rootElemRef: 0};
    out.domTree.directives = commons.templateCache._fns;
    out.domTree.setContext({currentPage: this});
    out.rootElemRef = commons.templateCache.get(this.layoutFileName)(out.domTree,
        {ddc: new documentData.DDC(commons.db), url: this.urlPcs});
    return out;
};


// == siteGraph-singleton ====
// =============================================================================
exports.siteGraph = {
    pages: {},
    pageCount: 0,
    /**
     * @param {string} serialized '{'
     *     '"pages": [' // [[<url>,<parentUrl>,<templateName>,[<url>,...]],...]
     *         '["/home","","1.html",["/foo"]],'
     *         '["/foo","","2.html",[]]'
     *     ']'
     * '}'
     */
    parseAndLoadFrom: function(serialized) {
        var json = JSON.parse(serialized);
        this.pageCount = json.pages.length;
        for (var i = 0; i < this.pageCount; ++i) {
            var data = json.pages[i];
            this.addPage(data[0], data[1], data[2], data[3].reduce(function(o, url) {
                o[url] = 1; return o;
            }, {}));
        }
        this.pages[exports.siteConfig.homeUrl].refCount += 1;
        for (var url in this.pages) {
            for (var outUrl in this.pages[url].linksTo) {
                this.pages[outUrl].refCount += outUrl != url; // Self-refs don't count
            }
        }
    },
    /**
     * @returns {string}
     */
    serialize: function() {
        var ir = {pages: []};
        for (var url in this.pages) {
            var page = this.pages[url];
            var linksToAsArr = [];
            for (var outUrl in page.linksTo) linksToAsArr.push(outUrl);
            ir.pages.push([url, page.parentUrl, page.layoutFileName, linksToAsArr]);
        }
        return JSON.stringify(ir);
    },
    /**
     * @param {string} url
     * @returns {Page|undefined}
     */
    getPage: function(url) {
        return this.pages[url];
    },
    /**
     * @see Page
     * @returns {Page}
     */
    addPage: function(url, parentUrl, layoutFileName, outboundUrls, refCount) {
        if (url.charAt(0) != '/') url = '/' + url;
        this.pages[url] = new Page(url, parentUrl, layoutFileName, outboundUrls, refCount);
        return this.pages[url];
    },
    /**
     * @param {string} layoutFileName
     * @returns {bool}
     */
    layoutHasUsers: function(layoutFileName) {
        var inUse = false;
        for (var url in this.pages) {
            if (this.pages[url].layoutFileName == layoutFileName) {
                inUse = true; break;
            }
        }
        return inUse;
    }
};


// == siteConfig-singleton: stores the values of site.ini ====
// =============================================================================
exports.siteConfig = {
    name: '',
    homeUrl: '',
    defaultLayout: '',
    contentTypes: [],
    /**
     * @native
     * @throws {Error}
     */
    loadFromDisk: function() {}
};


// == website-singleton ====
// =============================================================================
exports.website = {
    fs: commons.fs,
    crypto: crypto,
    Uploader: commons.Uploader,
    siteGraph: exports.siteGraph,
    config: exports.siteConfig,
    /** */
    init: function() {
        // Populate exports.siteConfig (from site.ini)
        this.config.loadFromDisk();
        // Populate exports.siteGraph
        var self = this;
        commons.db.select('select `graph` from websites limit 1', function(row) {
            self.siteGraph.parseAndLoadFrom(row.getString(0));
        });
        // Read and compile each template from disk to commons.templateCache
        this.fs.readDir(insnEnv.sitePath, function(fname) {
            var lastDotPos = fname.lastIndexOf('.');
            if (lastDotPos == -1 || fname.substr(lastDotPos) != '.htm') return;
            try { self.compileAndCacheTemplate(fname); }
            catch(e) { /**/ }
        });
        commons.signals.emit('siteGraphRescanRequested', 'full');
    },
    /**
     * @param {(renderedHtml: string, page: Page): any|bool} onEach
     * @param {Array?} issues
     * @param {{[string]: any;}?} pages
     * @returns {bool} false if there was issues, true otherwise
     */
    generate: function(onEach, issues, pages) {
        if (!pages) pages = this.siteGraph.pages;
        for (var url in pages) {
            var page = this.siteGraph.getPage(url);
            if (onEach(page.render(null, issues), page) === false) break;
        }
        return !issues || issues.length == 0;
    },
    /**
     * @param {string} fileName
     * @throws {Error}
     */
    compileAndCacheTemplate: function(fileName) {
        commons.templateCache.put(fileName, commons.transpiler.transpileToFn(
            this.fs.read(insnEnv.sitePath + fileName),
            fileName
        ));
        return true;
    },
    /**
     * @param {string} fileUrl
     * @returns {string} sha1 eg. da39a3ee5e6b4b0d3255bfef95601890afd80709
     * @throws {Error}
     */
    readFileAndCalcChecksum: function(fileUrl) {
        return this.crypto.sha1(this.fs.read(insnEnv.sitePath + fileUrl.substr(1)));
    }
};

/**
 * @returns {number} numAffectedRows
 * @throws {Error}
 */
exports.saveToDb = function(siteGraph) {
    return commons.db.update('update websites set `graph` = ?', function(stmt) {
        stmt.bindString(0, siteGraph.serialize());
    });
};

exports.NOT_UPLOADED = 0;
exports.OUTDATED = 1;
exports.UPLOADED = 2;
exports.DELETED = 3;