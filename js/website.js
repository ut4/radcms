var commons = require('common-services.js');
var documentData = require('document-data.js');
var directives = require('directives.js');

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
    var layout = exports.siteGraph.getTemplate(this.layoutFileName);
    if (!layout || !layout.exists) {
        var message = 'The layout file \'' + this.layoutFileName + '\' doesn\'t exists' +
                      (layout ? ' yet, or is empty.' : '.');
        if (issues) issues.push(this.url + '>' + message);
        return '<html><body>' + message + '</body></html>';
    }
    // function cachedTemplate(fetchAll, fetchOne, url) {           <-- outer
    //     var data1 = ddc.fetchAll()...
    //     return function(domTree, getDataFor, directives) {...};  <-- inner
    // }
    var outerFn = commons.templateCache.get(this.layoutFileName);
    var ddc = new documentData.DDC();
    var innerFn = outerFn(ddc.fetchAll.bind(ddc), ddc.fetchOne.bind(ddc), this.urlPcs);
    //
    fetchData(ddc);
    //
    var domTree = new commons.DomTree();
    domTree.setContext(this);
    if (!dataToFrontend) {
        return domTree.render(innerFn(domTree, ddc.getDataFor.bind(ddc), directives));
    }
    var html = domTree.render(innerFn(domTree, ddc.getDataFor.bind(ddc), directives));
    dataToFrontend.page = {url: this.url, layoutFileName: this.layoutFileName};
    dataToFrontend.allContentNodes = ddc.data;
    dataToFrontend.directiveInstances = [];
    domTree.getRenderedFnComponents().forEach(function(fnData) {
        if (fnData.fn == directives.ArticleList) {
            dataToFrontend.directiveInstances.push(
                {type: 'ArticleList', contentNodes: fnData.props.articles}
            );
        }
    });
    return html;
};
/**
 * @returns {DomTree}
 */
Page.prototype.dryRun = function() {
    var outerFn = commons.templateCache.get(this.layoutFileName);
    var ddc = new documentData.DDC();
    var innerFn = outerFn(ddc.fetchAll.bind(ddc), ddc.fetchOne.bind(ddc), this.urlPcs);
    //
    fetchData(ddc);
    //
    var domTree = new commons.DomTree();
    domTree.setContext(this);
    innerFn(domTree, ddc.getDataFor.bind(ddc), directives);
    return domTree;
};

/**
 * @param {DDC} ddc
 */
function fetchData(ddc) {
    if (ddc.batchCount) {
        var cnodes = [];
        commons.db.select(ddc.toSql(), function(row) {
            var data = JSON.parse(row.getString(2));
            data.defaults = {
                id: row.getInt(0),
                name: row.getString(1),
                dataBatchConfigId: row.getInt(3)
            };
            cnodes.push(data);
        });
        ddc.setData(cnodes);
    }
}


// == Template ====
// =============================================================================
/**
 * @param {string} fileName
 * @param {bool?} exists = false
 */
function Template(fileName, exists) {
    this.fileName = fileName;
    this.exists = exists === true;
}


// == siteGraph-singleton ====
// =============================================================================
exports.siteGraph = {
    pages: {},
    pageCount: 0,
    templates: {},
    templateCount: 0,
    /**
     * @param {string} serialized '{'
     *     '"pages": [' // [[<url>,<parentUrl>,<templateName>,[<url>,...]],...]
     *         '["/home",0,"1.html",["/foo"]],'
     *         '["/foo",0,"2.html",[]]'
     *     '],'
     *     '"templates":["1.htm","2.htm"]' // [<filename>,...]
     * '}'
     */
    parseAndLoadFrom: function(serialized) {
        var json = JSON.parse(serialized);
        this.pageCount = json.pages.length;
        this.templateCount = json.templates.length;
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
        for (i = 0; i < this.templateCount; ++i) {
            var t = new Template(json.templates[i], true);
            this.templates[t.fileName] = t;
        }
    },
    /**
     * @returns {string}
     */
    serialize: function() {
        var ir = {
            pages: [],
            templates: Object.keys(this.templates)
        };
        for (var url in this.pages) {
            var page = this.pages[url];
            var linksToAsArr = [];
            for (var outUrl in page.linksTo) linksToAsArr.push(outUrl);
            ir.pages.push([url, page.parentUrl, page.layoutFileName, linksToAsArr]);
        }
        return JSON.stringify(ir);
    },
    getPage: function(url) {
        return this.pages[url];
    },
    getTemplate: function(fileName) {
        return this.templates[fileName];
    },
    addPage: function(url, parentUrl, layoutFileName, outboundUrls, refCount) {
        if (url.charAt(0) != '/') url = '/' + url;
        this.pages[url] = new Page(url, parentUrl, layoutFileName, outboundUrls, refCount);
        return this.pages[url];
    },
    addTemplate: function(fileName, exists) {
        var t = new Template(fileName, exists);
        this.templates[fileName] = t;
        return this.templates[fileName];
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
    Uploader: commons.Uploader,
    siteGraph: exports.siteGraph,
    config: exports.siteConfig,
    /** */
    init: function() {
        this.config.loadFromDisk();
        var siteGraph = this.siteGraph;
        commons.db.select('select `graph` from websites limit 1', function(row) {
            siteGraph.parseAndLoadFrom(row.getString(0));
        });
        for (var fileName in siteGraph.templates) {
            if (commons.templateCache.has(fileName)) return;
            try { this.compileAndCacheTemplate(fileName); }
            catch (e) { siteGraph.templates[fileName].exists = false; }
        }
    },
    /**
     * @param {(renderedHtml: string): bool} onEach
     * @param {Array?} issues
     * @returns {number} Number of succeful writes
     */
    generate: function(onEach, issues) {
        var numSuccesfulIterations = 0;
        for (var url in this.siteGraph.pages) {
            var page = this.siteGraph.getPage(url);
            if (onEach(page.render(null, issues), page))
                numSuccesfulIterations++;
            else
                return numSuccesfulIterations;
        }
        return numSuccesfulIterations;
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
     * @param {string} fileName
     */
    deleteAndUncacheTemplate: function(fileName) {
        commons.templateCache.remove(fileName);
        delete this.siteGraph.templates[fileName];
    }
};