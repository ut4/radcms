var commons = require('common-services.js');
var documentData = require('document-data.js');

/**
 * @param {string} url
 * @param {string} layoutFileName
 * @constructor
 */
function Page(url, layoutFileName) {
    this.url = url;
    this.layoutFileName = layoutFileName;
}
/**
 * @returns {string}
 */
Page.prototype.render = function() {
    // function cachedTemplate(url, ddc) {  <-- outer
    //     var data1 = ddc.fetchAll()...
    //     return function(domTree) {...};  <-- inner
    // }
    var outerFn = commons.templateCache.get(this.layoutFileName);
    var ddc = new documentData.DDC();
    var innerFn = outerFn(ddc, this.url);
    //
    if (ddc.batchCount) {
        var components = [];
        commons.db.select(ddc.toSql(), function(row) {
            var component = JSON.parse(row.getString(2));
            component.id = row.getInt(0);
            component.name = row.getString(1);
            component.dataBatchConfigId = row.getInt(3);
            components.push(component);
        });
        ddc.setComponents(components);
    }
    //
    var domTree = new commons.DomTree();
    return domTree.render(innerFn(domTree));
};

exports.siteGraph = {
    pages: {},
    pageCount: 0,
    templates: {},
    templateCount: 0,
    /** @native */
    parseFrom: function(_) {
        this.pages = {
            '/': new Page('/', 'home-layout.jsx.htm'),
            '/page2': new Page('/page2', 'page-layout.jsx.htm'),
            '/page3': new Page('/page3', 'page-layout.jsx.htm'),
        };
        this.pageCount = 3;
        this.templates = {
            'home-layout.jsx.htm': {},
            'page-layout.jsx.htm': {},
        };
        this.templateCount = 2;
    },
    getPage: function(url) {
        return this.pages[url];
    },
    getTemplate: function(fname) {
        return this.templates[fname];
    }
};

exports.website = {
    siteGraph: exports.siteGraph,
    /** */
    init: function() {
        this.siteGraph.parseFrom();
        for (var fname in this.siteGraph.templates) {
            if (commons.templateCache.has(fname)) continue;
            commons.templateCache.put(fname, commons.transpiler.transpileToFn(
                commons.fs.read(insnEnv.sitePath + fname)
            ));
        }
    },
    /**
     * @param {(renderedHtml: string): bool} onEach
     * @returns {number} Number of succeful writes
     */
    generate: function(onEach) {
        var numSuccesfulIterations = 0;
        for (var url in this.siteGraph.pages) {
            var page = this.siteGraph.pages[url];
            if (onEach(page.render(), page))
                numSuccesfulIterations++;
            else
                return numSuccesfulIterations;
        }
        return numSuccesfulIterations;
    }
};