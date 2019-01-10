var commons = require('common-services.js');
var documentData = require('document-data.js');

/**
 * @param {string} url
 * @param {number} parentId
 * @param {string} layoutFileName
 * @constructor
 */
function Page(url, parentId, layoutFileName) {
    this.url = url;
    this.parentId = parentId;
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

function Template(fileName) {
    this.fileName = fileName;
    this.exists = true;
}

exports.siteGraph = {
    pages: {},
    pageCount: 0,
    templates: [],
    templateCount: 0,
    /**
     * @param {string} serialized '{
     *     "pages":[["/",0,0],["/foo",0,1]], // [[<url>,<parentId>,<templateIdx>]...]
     *     "templates":["1.htm","2.htm"]     // [<filename>,...]
     * }'
     */
    parseAndLoadFrom: function(serialized) {
        var json = JSON.parse(serialized);
        this.pageCount = json.pages.length;
        this.templateCount = json.templates.length;
        for (var i = 0; i < this.pageCount; ++i) {
            var data = json.pages[i];
            if (!json.templates[data[2]])
                throw new Error('Invalid template idx ' + data[2]);
            this.pages[data[0]] = new Page(data[0], data[1], json.templates[data[2]]);
        }
        this.templates = json.templates.map(function(fileName) {
            return new Template(fileName);
        });
    },
    getPage: function(url) {
        return this.pages[url];
    },
    getTemplate: function(idx) {
        return this.templates[idx];
    }
};

exports.website = {
    siteGraph: exports.siteGraph,
    /** */
    init: function() {
        var siteGraph = this.siteGraph;
        commons.db.select('select `graph` from websites limit 1', function(row) {
            siteGraph.parseAndLoadFrom(row.getString(0));
        });
        this.siteGraph.templates.forEach(function(t) {
            if (commons.templateCache.has(t.fileName)) return;
            commons.templateCache.put(t.fileName, commons.transpiler.transpileToFn(
                commons.fs.read(insnEnv.sitePath + t.fileName)
            ));
        });
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