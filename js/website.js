/**
 * == website.js ====
 *
 * In this file:
 *
 * - Website (class)
 * - Page (class)
 * - SiteGraph (class)
 * - SiteConfig (class)
 *
 */
var commons = require('common-services.js');
var documentData = require('document-data.js');
var crypto = require('crypto.js');

/**
 * @param {string} dirPath eg. '/full/path/to/my/site/'
 * @param {string?} dbUrl
 * @constructor
 */
exports.Website = function(dirPath, dbUrl) {
    this.dirPath = dirPath;
    this.db = new commons.Db(dbUrl || dirPath + 'data.db');
    this.graph = new exports.SiteGraph();
    this.config = new exports.SiteConfig();
    this.fs = commons.fs;
    this.crypto = crypto;
    this.Uploader = commons.Uploader;
    this.app = null;
};
/**
 * Writes and populates data files (data.db, site.ini, some-template.jsx.htm
 * etc.) to $this.dirPath.
 *
 * @param {string} sampleDataName 'minimal', 'blog' etc.
 * @throws {TypeError} if $sampleDataName wasn't valid
 * @throws {Error} if there was a database or fs error
 */
exports.Website.prototype.install = function(sampleDataName) {
    /**
     * 1. Create the schema (create table foo ...)
     */
    this.db.execNamedSql(':websiteSchema:');
    /**
     * 2. Insert the sample data (insert into foo ...)
     */
    if (sampleDataName) {
        var sampleDataOpts = this.app.getSampleData(true); // true == include files
        var sampleData = null;
        for (var i = 0; i < sampleDataOpts.length; ++i) {
            if (sampleDataOpts[i].name == sampleDataName) {
                sampleData = sampleDataOpts[i]; break;
            }
        }
        if (!sampleData) throw new TypeError('"' + sampleDataName +
                                             '" is not valid sample data name');
        this.db.execNamedSql(':' + sampleDataName + 'SampleData:');
        /**
         * 3. Write the files.
         */
        var self = this;
        sampleData.files.forEach(function(file) {
            self.fs.write(self.dirPath + file.name, file.contents);
        });
    }
};
/**
 */
exports.Website.prototype.init = function() {
    // Populate this.config (from $this.dirPath+'site.ini')
    this.config.loadFromDisk(this.dirPath);
    // Populate this.graph
    var self = this;
    this.db.select('select `graph` from self limit 1', function(row) {
        self.graph.parseAndLoadFrom(row.getString(0), self.config.homeUrl);
    });
    // Read and compile each template from disk to commons.templateCache
    this.fs.readDir(this.dirPath, function(entry) {
        var lastDotPos = !entry.isDir ? entry.name.lastIndexOf('.') : -1;
        if (lastDotPos == -1 || entry.name.substr(lastDotPos) != '.htm') return;
        try { self.compileAndCacheTemplate(entry.name); }
        catch(e) { /**/ }
    });
    commons.signals.emit('siteGraphRescanRequested', 'full');
};
/**
 * @param {(renderedHtml: string, page: Page): any|bool} onEach
 * @param {Array?} issues
 * @param {{[string]: any;}?} pages
 * @returns {bool} false if there was issues, true otherwise
 */
exports.Website.prototype.generate = function(onEach, issues, pages) {
    if (!pages) pages = this.graph.pages;
    for (var url in pages) {
        var page = this.graph.getPage(url);
        if (onEach(this.renderPage(page, null, issues), page) === false) break;
    }
    return !issues || issues.length == 0;
};
/**
 * @param {Page} page
 * @param {Object?} dataToFrontend
 * @param {Array?} issues
 * @returns {string}
 */
exports.Website.prototype.renderPage = function(page, dataToFrontend, issues) {
    if (!commons.templateCache.has(page.layoutFileName)) {
        var message = 'The layout file \'' + page.layoutFileName +
            '\' doesn\'t exist yet, or is empty.';
        if (issues) issues.push(page.url + '>' + message);
        return '<html><body>' + message + '</body></html>';
    }
    var domTree = new commons.DomTree();
    domTree.directives = commons.templateCache._fns;
    domTree.currentPage = page;
    var props = {ddc: new documentData.DDC(this.db), url: page.urlPcs};
    if (!dataToFrontend) {
        return domTree.render(commons.templateCache.get(page.layoutFileName)(domTree, props));
    }
    var html = domTree.render(commons.templateCache.get(page.layoutFileName)(domTree, props));
    dataToFrontend.allContentNodes = props.ddc.data;
    domTree.getRenderedFnComponents().forEach(function(fnCmp) {
        if (fnCmp.fn == commons.templateCache.get('RadArticleList')) {
            dataToFrontend.directiveElems.push(
                {uiPanelType: 'EditableList', contentType: 'Article',
                    contentNodes: fnCmp.props.articles}
            );
        } else if (fnCmp.fn == commons.templateCache.get('RadList')) {
            dataToFrontend.directiveElems.push(
                {uiPanelType: 'EditableList', contentType: fnCmp.props.contentType,
                    contentNodes: fnCmp.props.items}
            );
        }
    });
    return html;
};
/**
* @param {Page} page
* @param {DomTree} domTree (out)
* @returns string
*/
exports.Website.prototype.renderPage2 = function(page, domTree) {
   domTree.directives = commons.templateCache._fns;
   domTree.currentPage = page;
   return domTree.render(commons.templateCache.get(page.layoutFileName)(
       domTree, {ddc: new documentData.DDC(this.db), url: page.urlPcs}));
};
/**
 * @param {string} fileName
 * @throws {Error}
 */
exports.Website.prototype.compileAndCacheTemplate = function(fileName) {
    commons.templateCache.put(fileName, commons.transpiler.transpileToFn(
        this.fs.read(this.dirPath + fileName),
        fileName
    ));
    return true;
};
/**
 * @param {string} fileUrl
 * @returns {string} sha1 eg. da39a3ee5e6b4b0d3255bfef95601890afd80709
 * @throws {Error}
 */
exports.Website.prototype.readFileAndCalcChecksum = function(fileUrl) {
    return this.crypto.sha1(this.fs.read(this.dirPath + fileUrl.substr(1)));
};
/**
 * @returns {number} numAffectedRows
 * @throws {Error}
 */
exports.Website.prototype.saveToDb = function(siteGraph) {
    return this.db.update('update self set `graph` = ?', function(stmt) {
        stmt.bindString(0, siteGraph.serialize());
    });
};
/**
 * @param {Object} app
 */
exports.Website.prototype.setApp = function(app) {
    this.app = app;
};


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
 * @constructor
 */
exports.SiteGraph = function() {
    this.pages = {};
    this.pageCount = 0;
};
/**
 * @param {string} serialized '{'
 *     '"pages": [' // [[<url>,<parentUrl>,<templateName>,[<url>,...]],...]
 *         '["/home","","1.html",["/foo"]],'
 *         '["/foo","","2.html",[]]'
 *     ']'
 * '}'
 * @param {string} homeUrl
 */
exports.SiteGraph.prototype.parseAndLoadFrom = function(serialized, homeUrl) {
    var json = JSON.parse(serialized);
    this.pageCount = json.pages.length;
    for (var i = 0; i < this.pageCount; ++i) {
        var data = json.pages[i];
        this.addPage(data[0], data[1], data[2], data[3].reduce(function(o, url) {
            o[url] = 1; return o;
        }, {}));
    }
    this.pages[homeUrl].refCount += 1;
    for (var url in this.pages) {
        for (var outUrl in this.pages[url].linksTo) {
            this.pages[outUrl].refCount += outUrl != url; // Self-refs don't count
        }
    }
};
/**
 * @returns {string}
 */
exports.SiteGraph.prototype.serialize = function() {
    var ir = {pages: []};
    for (var url in this.pages) {
        var page = this.pages[url];
        var linksToAsArr = [];
        for (var outUrl in page.linksTo) linksToAsArr.push(outUrl);
        ir.pages.push([url, page.parentUrl, page.layoutFileName, linksToAsArr]);
    }
    return JSON.stringify(ir);
};
/**
 * @param {string} url
 * @returns {Page|undefined}
 */
exports.SiteGraph.prototype.getPage = function(url) {
    return this.pages[url];
};
/**
 * @see Page
 * @returns {Page}
 */
exports.SiteGraph.prototype.addPage = function(url, parentUrl, layoutFileName, outboundUrls, refCount) {
    if (url.charAt(0) != '/') url = '/' + url;
    this.pages[url] = new Page(url, parentUrl, layoutFileName, outboundUrls, refCount);
    return this.pages[url];
};
/**
 * @param {string} layoutFileName
 * @returns {bool}
 */
exports.SiteGraph.prototype.layoutHasUsers = function(layoutFileName) {
    var inUse = false;
    for (var url in this.pages) {
        if (this.pages[url].layoutFileName == layoutFileName) {
            inUse = true; break;
        }
    }
    return inUse;
};


/**
 * Holds the configuration (site.ini) of a single website.
 *
 * @constructor
 */
exports.SiteConfig = function() {
    this.name = '';
    this.homeUrl = '';
    this.defaultLayout = '';
    this.contentTypes = [];
};
/**
 * Reads and parses $dirPath+'site.ini' and stores the values to $this.*.
 *
 * @native
 * @param {string} dirPath eg. '/full/path/to/my/site/'
 * @throws {Error}
 */
exports.SiteConfig.prototype.loadFromDisk = function(/*dirPath*/) {};


exports.NOT_UPLOADED = 0;
exports.OUTDATED = 1;
exports.UPLOADED = 2;
exports.DELETED = 3;