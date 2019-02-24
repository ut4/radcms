var commons = require('common-services.js');
var documentData = require('document-data.js');
var directives = require('directives.js');
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
    var layout = exports.siteGraph.getTemplate(this.layoutFileName);
    if (!layout || !layout.isOk) {
        var message = 'The layout file \'' + this.layoutFileName + '\' doesn\'t exist' +
                      (layout ? ' yet, or is empty.' : '.');
        if (issues) issues.push(this.url + '>' + message);
        return '<html><body>' + message + '</body></html>';
    }
    // function cachedTemplate(ddc, url) {             <-- outer
    //     var data1 = fetchAll()...
    //     return function(domTree, directives) {...}; <-- inner
    // }
    var outerFn = commons.templateCache.get(this.layoutFileName);
    var ddc = new documentData.DDC();
    var innerFn = outerFn(ddc, this.urlPcs);
    //
    fetchData(ddc);
    //
    var domTree = new commons.DomTree();
    domTree.setContext(this);
    domTree.directives = directives;
    if (!dataToFrontend) {
        return domTree.render(innerFn(domTree));
    }
    var html = domTree.render(innerFn(domTree));
    dataToFrontend.allContentNodes = ddc.data;
    domTree.getRenderedFnComponents().forEach(function(fnCmp) {
        if (fnCmp.fn == directives.RadArticleList) {
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
    var outerFn = commons.templateCache.get(this.layoutFileName);
    var ddc = new documentData.DDC();
    var innerFn = outerFn(ddc, this.urlPcs);
    //
    fetchData(ddc);
    //
    var domTree = new commons.DomTree();
    domTree.directives = directives;
    domTree.setContext(this);
    innerFn(domTree);
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
 * @param {bool?} isOk = false
 * @param {bool?} isInUse = false
 */
function Template(fileName, isOk, isInUse) {
    this.fileName = fileName;
    this.isOk = isOk === true;
    this.isInUse = isInUse === true;
}


// == siteGraph-singleton ====
// =============================================================================
exports.siteGraph = {
    pages: {},
    pageCount: 0,
    templates: {},
    templateCount: 0,
    hasUnsavedChanges: false,
    /**
     * @param {string} serialized '{'
     *     '"pages": [' // [[<url>,<parentUrl>,<templateName>,[<url>,...]],...]
     *         '["/home",0,"1.html",["/foo"]],'
     *         '["/foo",0,"2.html",[]]'
     *     '],'
     *     '"templates":[["1.htm",1],["2.htm",0]]' // [[<filename>,<isOk>],...]
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
            data = json.templates[i];
            var t = new Template(data[0], data[1] === 1, data[2] === 1);
            this.templates[t.fileName] = t;
        }
    },
    /**
     * @returns {string}
     */
    serialize: function() {
        var ir = {
            pages: [],
            templates: []
        };
        for (var url in this.pages) {
            var page = this.pages[url];
            var linksToAsArr = [];
            for (var outUrl in page.linksTo) linksToAsArr.push(outUrl);
            ir.pages.push([url, page.parentUrl, page.layoutFileName, linksToAsArr]);
        }
        for (var fileName in this.templates) {
            var t = this.templates[fileName];
            ir.templates.push([fileName, t.isOk ? 1 : 0, t.isInUse ? 1 : 0]);
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
     * @param {string} fileName
     * @returns {Template|undefined}
     */
    getTemplate: function(fileName) {
        return this.templates[fileName];
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
     * @see Template
     * @returns {Template}
     */
    addTemplate: function(fileName, isOk, isInUse) {
        this.templates[fileName] = new Template(fileName, isOk, isInUse);
        return this.templates[fileName];
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
        // Populate exports.siteConfig
        this.config.loadFromDisk();
        // Populate exports.siteGraph
        var siteGraph = this.siteGraph;
        commons.db.select('select `graph` from websites limit 1', function(row) {
            siteGraph.parseAndLoadFrom(row.getString(0));
        });
        // Sync siteGraph.templates and populate commons.templateCache
        var filesOnDisk = {};
        var tmplDiff = {added: 0, removed: 0, validityChanged: 0};
        this.fs.readDir(insnEnv.sitePath, function(fname) {
            var lastDotPos = fname.lastIndexOf('.');
            if (lastDotPos > -1 && fname.substr(lastDotPos) == '.htm') {
                filesOnDisk[fname] = 1;
                if (!siteGraph.templates[fname]) {
                    siteGraph.addTemplate(fname, false, siteGraph.layoutHasUsers(fname));
                    tmplDiff.added += 1;
                }
            }
        });
        for (var fname in siteGraph.templates) {
            var t = siteGraph.templates[fname];
            var stillExists = filesOnDisk.hasOwnProperty(fname);
            if (stillExists && t.isInUse) {
                try {
                    this.compileAndCacheTemplate(fname);
                    if (!t.isOk) tmplDiff.validityChanged += 1; // from invalid to ok
                    t.isOk = true;
                } catch (e) {
                    if (t.isOk) tmplDiff.validityChanged += 1; // from ok to invalid
                    t.isOk = false;
                }
            } else if (!stillExists) {
                delete siteGraph.templates[fname];
                tmplDiff.removed += 1;
            }
        }
        var message = [];
        if (tmplDiff.added) message.push('discovered ' + tmplDiff.added + ' new templates');
        if (tmplDiff.removed) message.push('unregistered ' + tmplDiff.removed + ' templates');
        if (message.length || tmplDiff.validityChanged) {
            if (message.length) commons.log('[Info]: ' + message.join(', '));
        }
        // Rescan for new/deleted links and save the siteGraph to the database
        exports.siteGraph.hasUnsavedChanges = message.length || tmplDiff.validityChanged;
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
            fileName,
            true // Transpile ddc variables
        ));
        return true;
    },
    /**
     * @param {string} fileName
     */
    deleteAndUncacheTemplate: function(fileName) {
        commons.templateCache.remove(fileName);
        delete this.siteGraph.templates[fileName];
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