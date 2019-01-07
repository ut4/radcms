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
    if (this.url == '/') {
        ddc.setComponents([
            {title: 'Art1', cmp: {name: '/art1'}, dbcId: 1},
            {title: 'Art2', cmp: {name: '/art2'}, dbcId: 1},
            {title: 'Art3', cmp: {name: '/art3'}, dbcId: 1},
        ]);
    } else {
        ddc.setComponents([
            {title: 'Art1', cmp: {name: this.url}, dbcId: 1},
        ]);
    }
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
            '/': new Page('/', 'main-layout.jsx.htm'),
            '/art1': new Page('/art1', 'article-layout.jsx.htm'),
            '/art2': new Page('/art2', 'article-layout.jsx.htm'),
            '/art3': new Page('/art3', 'article-layout.jsx.htm'),
        };
        this.pageCount = 4;
        this.templates = {
            'main-layout.jsx.htm': {},
            'article-layout.jsx.htm': {},
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
    siteGraph: (exports.siteGraph.parseFrom(), exports.siteGraph),
    /**
     * @param {(renderedHtml: string): bool} onEach
     * @returns {number} Number of succeful writes
     */
    generate: function(onEach) {
        var numSuccesfulWrites = 0;
        for (var url in this.siteGraph.pages) {
            var page = this.siteGraph.pages[url];
            if (onEach(page.render(), page))
                numSuccesfulWrites++;
            else
                return numSuccesfulWrites;
        }
        return numSuccesfulWrites;
    }
};