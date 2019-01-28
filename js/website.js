var commons = require('common-services.js');
var documentData = require('document-data.js');
var directives = require('directives.js');

// == Page ====
// =============================================================================
/**
 * @param {string} url '/foo' or '/foo/page/2'
 * @param {number} parentId
 * @param {number} layoutIdx siteGraph.templates.indexOf(<layout>)
 * @param {Object?} linksTo = {} A map of outbound urls
 * @param {number?} refCount = 0 The amount of places this page is (referenced from / linked to)
 * @constructor
 */
function Page(url, parentId, layoutIdx, linksTo, refCount) {
    this.url = url;
    this.urlPcs = url.split('/').slice(1); // ['', 'foo'] -> ['foo']
    this.parentId = parentId;
    this.layoutIdx = layoutIdx;
    this.linksTo = linksTo || {};
    this.refCount = refCount || 0;
}
/**
 * @param {Object?} pageData
 * @param {Array?} issues
 * @returns {string}
 */
Page.prototype.render = function(pageData, issues) {
    var layout = exports.siteGraph.templates[this.layoutIdx];
    if (!layout.exists || !layout.samplePage) {
        var message = 'Layout file \'' + layout.fileName + '\' doesn\'t exists yet, or is empty.';
        if (issues) issues.push(this.url + '>' + message);
        return '<html><body>' + message + '</body></html>';
    }
    // function cachedTemplate(fetchAll, fetchOne, url) {           <-- outer
    //     var data1 = ddc.fetchAll()...
    //     return function(domTree, getDataFor, directives) {...};  <-- inner
    // }
    var outerFn = commons.templateCache.get(this.layoutIdx);
    var ddc = new documentData.DDC();
    var innerFn = outerFn(ddc.fetchAll.bind(ddc), ddc.fetchOne.bind(ddc), this.urlPcs);
    //
    fetchData(ddc);
    //
    var domTree = new commons.DomTree();
    if (!pageData) {
        return domTree.render(innerFn(domTree, ddc.getDataFor.bind(ddc), directives));
    }
    var html = domTree.render(innerFn(domTree, ddc.getDataFor.bind(ddc), directives));
    pageData.allContentNodes = ddc.data;
    pageData.directiveInstances = domTree.getRenderedFnComponents()
        .map(function(fnData) {
            if (fnData.fn == directives.ArticleList) {
                return {type: 'ArticleList', contentNodes: fnData.props.articles};
            }
        });
    return html;
};
/**
 * @returns {DomTree}
 */
Page.prototype.dryRun = function() {
    var outerFn = commons.templateCache.get(this.layoutIdx);
    var ddc = new documentData.DDC();
    var innerFn = outerFn(ddc.fetchAll.bind(ddc), ddc.fetchOne.bind(ddc), this.urlPcs);
    //
    fetchData(ddc);
    //
    var domTree = new commons.DomTree();
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
 * @param {number} idx siteGraph.templates.indexOf(this)
 * @param {Page?} samplePage = undefined
 * @param {bool?} exists = false
 */
function Template(fileName, idx, samplePage, exists) {
    this.fileName = fileName;
    this.idx = idx;
    this.exists = exists === true;
    this.samplePage = samplePage;
}


// == siteGraph-singleton ====
// =============================================================================
exports.siteGraph = {
    pages: {},
    pageCount: 0,
    templates: [],
    templateCount: 0,
    /**
     * @param {string} serialized '{'
     *     '"pages": [' // [[<url>,<parentId>,<templateIdx>,[<url>,...]],...]
     *         '["/home",0,0,["/foo"]],'
     *         '["/foo",0,1,[]]'...
     *     '],'
     *     '"templates":["1.htm","2.htm"'...']' // [<filename>,...]
     * '}'
     */
    parseAndLoadFrom: function(serialized) {
        var json = JSON.parse(serialized);
        this.pageCount = json.pages.length;
        this.templateCount = json.templates.length;
        for (var i = 0; i < this.pageCount; ++i) {
            var data = json.pages[i];
            if (!json.templates[data[2]])
                throw new Error('Invalid template idx ' + data[2]);
            this.addPage(data[0], data[1], data[2], data[3].reduce(function(o, url) {
                o[url] = 1; return o;
            }, {}));
        }
        for (var url in this.pages) {
            for (var outUrl in this.pages[url].linksTo) {
                this.pages[outUrl].refCount += outUrl != url; // Self-refs don't count
            }
        }
        for (i = 0; i < this.templateCount; ++i) {
            var t = new Template(json.templates[i], i, null, true);
            for (url in this.pages) {
                if (this.pages[url].layoutIdx == t.idx) {
                    t.samplePage = this.pages[url]; break;
                }
            }
            this.templates.push(t);
        }
    },
    /**
     * @returns {string}
     */
    serialize: function() {
        var ir = {
            pages: [],
            templates: this.templates.map(function(t) { return t.fileName; })
        };
        for (var url in this.pages) {
            var page = this.pages[url];
            var linksToAsArr = [];
            for (var outUrl in page.linksTo) linksToAsArr.push(outUrl);
            ir.pages.push([url, 0, page.layoutIdx, linksToAsArr]);
        }
        return JSON.stringify(ir);
    },
    getPage: function(url) {
        return this.pages[url];
    },
    getTemplate: function(idx) {
        return this.templates[idx];
    },
    findTemplate: function(fileName) {
        var l = this.templates.length;
        for (var i = 0; i < l; ++i) {
            if (this.templates[i].fileName == fileName) return this.templates[i];
        }
        return null;
    },
    addPage: function(url, parentId, layoutIdx, outboundUrls, refCount) {
        if (url.charAt(0) != '/') url = '/' + url;
        this.pages[url] = new Page(url, parentId, layoutIdx, outboundUrls, refCount);
        return this.pages[url];
    },
    addTemplate: function(fileName, samplePage, exists) {
        var t = new Template(fileName, this.templates.length, samplePage, exists);
        return this.templates[this.templates.push(t) - 1];
    }
};


// == siteConfig-singleton: stores the values of site.ini ====
// =============================================================================
exports.siteConfig = {
    name: '',
    homeUrl: '',
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
        this.siteGraph.templates.forEach(function(t) {
            if (commons.templateCache.has(t.idx)) return;
            try { this.compileAndCacheTemplate(t); }
            catch (e) { t.exists = false; }
        }, this);
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
     * @param {Template} template
     * @throws {Error}
     */
    compileAndCacheTemplate: function(template) {
        commons.templateCache.put(template.idx, commons.transpiler.transpileToFn(
            this.fs.read(insnEnv.sitePath + template.fileName),
            template.fileName
        ));
        return true;
    }
};