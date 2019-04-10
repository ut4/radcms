/**
 * # website.js
 *
 * In this file:
 *
 * ## Website: class
 * ## Page: class
 * ## SiteGraph: class
 * ## SiteConfig: class
 * ## UploadStatus: object|enum
 *
 */
const fs = require('fs');
const {performance} = require('perf_hooks');
const Sqlite = require('better-sqlite3');
const ini = require('ini');
const data = require('./static-data.js');
const {DomTree, templateCache, transpiler} = require('./templating.js');
const {DDC} = require('./document-data.js');
const {signals, fileWatcher, Uploader} = require('./common-services.js');

class Website {
    /**
     * @param {string} dirPath eg. '/full/path/to/my/site/'
     * @param {Object?} dbUrl
     * @constructor
     */
    constructor(dirPath, dbSettings) {
        this.dirPath = dirPath;
        this.db = new Sqlite(dirPath + 'data.db', dbSettings);
        this.graph = new SiteGraph();
        this.config = new SiteConfig();
        this.fileWatcher = fileWatcher;
        this.performance = performance;
        this.uploader = new Uploader();
        this.fs = fs;
    }
    /**
     * Writes and populates data files (data.db, site.ini, some-template.jsx.htm
     * etc.) to $this.dirPath.
     *
     * @param {string} sampleDataName 'minimal', 'blog' etc.
     * @throws {TypeError} if $sampleDataName wasn't valid
     * @throws {Error} if there was a database or fs error
     */
    install(sampleDataName) {
        /**
         * 1. Create the schema (create table foo ...)
         */
        this.db.exec(data.getNamedSql(':websiteSchema:'));
        /**
         * 2. Insert the sample data (insert into foo ...)
         */
        if (sampleDataName) {
            let sampleData = data.getSampleData(sampleDataName);
            if (!sampleData) throw new TypeError('"' + sampleDataName +
                                                 '" is not valid sample data name');
            this.db.exec(data.getNamedSql(':' + sampleDataName + 'SampleData:'));
            /**
             * 3. Write the files.
             */
            for (const key in sampleData.files) {
                this.fs.writeFileSync(this.dirPath + key, sampleData.files[key]);
            }
        }
    }
    /**
     */
    activate() {
        // Populate $this.config (from $this.dirPath+'site.ini')
        this.config.loadFromDisk(this.dirPath);
        // Populate $this.graph
        this.graph.parseAndLoadFrom(this.db.prepare('select `graph` from self limit 1').get().graph,
                                    this.config.homeUrl);
        // Read and compile each template from disk to templateCache
        this.fs.readdirSync(this.dirPath, {withFileTypes: true}).forEach(entry => {
            let lastDotPos = !entry.isDirectory() ? entry.name.lastIndexOf('.') : -1;
            if (lastDotPos === -1 || entry.name.substr(lastDotPos) !== '.htm') return;
            try { this.compileAndCacheTemplate(entry.name); }
            catch(e) { /**/ }
        });
        this.fileWatcher.watch(this.dirPath);
        signals.emit('siteGraphRescanRequested', 'full');
    }
    /**
     * @param {Page} page
     * @param {Object?} dataToFrontend
     * @param {Array?} issues
     * @returns {string}
     */
    renderPage(page, dataToFrontend, issues) {
        if (!templateCache.has(page.layoutFileName)) {
            let message = 'The layout file \'' + page.layoutFileName +
                          '\' doesn\'t exist yet, or is empty.';
            if (issues) issues.push(page.url + '>' + message);
            return '<html><body>' + message + '</body></html>';
        }
        let domTree = new DomTree();
        domTree.directives = templateCache._fns;
        domTree.currentPage = page;
        let props = {ddc: new DDC(this.db), url: page.urlPcs};
        if (!dataToFrontend) {
            return domTree.render(templateCache.get(page.layoutFileName)(props, domTree));
        }
        let tree = templateCache.get(page.layoutFileName)(props, domTree);
        let html = domTree.render(tree);
        dataToFrontend.allContentNodes = props.ddc.data;
        for (let fnCmp of domTree.getRenderedFnComponents(tree)) {
            if (fnCmp.fn == templateCache.get('RadArticleList')) {
                dataToFrontend.directiveElems.push(
                    {uiPanelType: 'EditableList', contentType: 'Article',
                        contentNodes: fnCmp.props.articles}
                );
            } else if (fnCmp.fn == templateCache.get('RadList')) {
                dataToFrontend.directiveElems.push(
                    {uiPanelType: 'EditableList', contentType: fnCmp.props.contentType,
                        contentNodes: fnCmp.props.items}
                );
            }
        }
        return html;
    }
    /**
     * @param {Page} page
     * @returns [DomTree, ElNode, string]
     */
    renderPage2(page) {
        const out = [new DomTree(), undefined, undefined];
        out[0].directives = templateCache._fns;
        out[0].currentPage = page;
        out[1] = templateCache.get(page.layoutFileName)(
            {ddc: new DDC(this.db), url: page.urlPcs}, out[0]);
        out[2] = out[0].render(out[1]);
        return out;
    }
    /**
     * @param {(renderedHtml: string, page: Page): any|bool} onEach
     * @param {Array?} issues
     * @param {{[string]: any;}?} pages
     * @returns {bool} false if there was issues, true otherwise
     */
    generate(onEach, issues, pages) {
        if (!pages) pages = this.graph.pages;
        for (const url in pages) {
            const page = this.graph.getPage(url);
            onEach(this.renderPage(page, null, issues), page);
        }
        return !issues || issues.length == 0;
    }
    /**
     * @returns {number} numAffectedRows
     * @throws {Error}
     */
    saveToDb(siteGraph) {
        return this.db.prepare('update self set `graph` = ?')
                      .run(siteGraph.serialize()).changes;
    }
    /**
     * @param {Object} app
     */
    setApp(app) {
        this.app = app;
    }
    /**
     * @param {string} fileName
     * @throws {Error}
     */
    compileAndCacheTemplate(fileName) {
        templateCache.put(fileName, transpiler.transpileToFn(
            this.fs.readFileSync(this.dirPath + fileName, 'utf-8')
        ));
        return true;
    }
    /**
     * @param {string} fileName eg '/file.jsx.htm'
     * @throws {Error}
     */
    readOwnFile(fileName) {
        return this.fs.readFileSync(this.dirPath + fileName.substr(1), 'utf-8');
    }
}

////////////////////////////////////////////////////////////////////////////////

class Page {
    /**
     * @param {string} url '/foo' or '/foo/page/2'
     * @param {string} parentUrl
     * @param {string} layoutFileName
     * @param {Object?} linksTo = {} A map of outbound urls
     * @param {number?} refCount = 0 The amount of places this page is linked to / referenced from
     */
    constructor(url, parentUrl, layoutFileName, linksTo, refCount) {
        this.url = url;
        this.urlPcs = url.split('/').slice(1); // ['', 'foo'] -> ['foo']
        this.parentUrl = parentUrl;
        this.layoutFileName = layoutFileName;
        this.linksTo = linksTo || {};
        this.refCount = refCount || 0;
    }
}

////////////////////////////////////////////////////////////////////////////////

class SiteGraph {
    constructor() {
        this.pages = {};
        this.pageCount = 0;
    }
    /**
     * @param {string} serialized '{'
     *     '"pages": [' // [[<url>,<parentUrl>,<templateName>,[<url>,...]],...]
     *         '["/home","","1.html",["/foo"]],'
     *         '["/foo","","2.html",[]]'
     *     ']'
     * '}'
     * @param {string} homeUrl
     */
    parseAndLoadFrom(serialized, homeUrl) {
        let json = JSON.parse(serialized);
        this.pageCount = json.pages.length;
        for (let i = 0; i < this.pageCount; ++i) {
            let data = json.pages[i];
            this.addPage(data[0], data[1], data[2], data[3].reduce((o, url) => {
                o[url] = 1; return o;
            }, {}));
        }
        this.pages[homeUrl].refCount += 1;
        for (let url in this.pages) {
            for (let outUrl in this.pages[url].linksTo) {
                this.pages[outUrl].refCount += outUrl != url; // Self-refs don't count
            }
        }
    }
    /**
     * @returns {string}
     */
    serialize() {
        let ir = {pages: []};
        for (let url in this.pages) {
            let page = this.pages[url];
            let linksToAsArr = [];
            for (let outUrl in page.linksTo) linksToAsArr.push(outUrl);
            ir.pages.push([url, page.parentUrl, page.layoutFileName, linksToAsArr]);
        }
        return JSON.stringify(ir);
    }
    /**
     * @param {string} url
     * @returns {Page|undefined}
     */
    getPage(url) {
        return this.pages[url];
    }
    /**
     * @see Page
     * @returns {Page}
     */
    addPage(url, parentUrl, layoutFileName, outboundUrls, refCount) {
        if (url.charAt(0) != '/') url = '/' + url;
        this.pages[url] = new Page(url, parentUrl, layoutFileName, outboundUrls, refCount);
        return this.pages[url];
    }
    /**
     * @param {string} layoutFileName
     * @returns {bool}
     */
    layoutHasUsers(layoutFileName) {
        let inUse = false;
        for (let url in this.pages) {
            if (this.pages[url].layoutFileName == layoutFileName) {
                inUse = true; break;
            }
        }
        return inUse;
    }
}

////////////////////////////////////////////////////////////////////////////////

/**
 * Holds the configuration (site.ini) of a single website.
 */
class SiteConfig {
    constructor() {
        this.fs = fs;
        this.ini = ini;
        //
        this.name = '';
        this.homeUrl = '';
        this.defaultLayout = '';
        this.contentTypes = [];
    }
    /**
     * Reads and parses $dirPath+'site.ini' and stores the values to $this.*.
     *
     * @param {string} dirPath eg. '/full/path/to/my/site/'
     * @throws Error
     */
    loadFromDisk(dirPath) {
        this._populateFrom(this.ini.parse(this.fs.readFileSync(dirPath + 'site.ini', 'utf-8')));
    }
    /**
     * @param {Object} config
     * @throws Error
     */
    _populateFrom(config) {
        let errors = [];
        const DEFAULT_DEFAULT_LAYOUT = 'main-layout.jsx.htm';
        /*
         * [Site]\nname
         */
        if (config.Site.name)
            this.name = config.Site.name;
        /*
         * [Site]\nhomeUrl
         */
        if (config.Site.homeUrl) {
            this.homeUrl = config.Site.homeUrl.charAt(0) === '/'
                ? config.Site.homeUrl
                : '/' + config.Site.homeUrl;
        } else {
            errors.push('[Site] homeUrl is required');
        }
        /*
         * [Site]\ndefaultLayout
         */
        this.defaultLayout = config.Site.defaultLayout || DEFAULT_DEFAULT_LAYOUT;
        /*
         * [ContentType:Foo]\nfield=dataType\nanother=dataType
         */
        this.contentTypes = [];
        for (const title in config) {
            if (title.indexOf('ContentType:') < 0) continue;
            for (const propName in config[title]) {
                const dataType = config[title][propName];
                if (dataType !== 'text' &&
                    dataType !== 'richtext') {
                    errors.push('"' + dataType + '" is not valid datatype.');
                }
            }
            this.contentTypes.push({name: title.substr(12), // 12='ContentType:'.length
                                    fields: config[title]});
        }
        if (!this.contentTypes.length)
            errors.push('At least one [ContentType:name] is required.');
        //
        if (errors.length) throw new Error(errors.join('\n'));
    }
}

const UploadStatus = {
    NOT_UPLOADED: 0,
    OUTDATED: 1,
    UPLOADED: 2,
    DELETED: 3,
};

exports.Website = Website;
exports.SiteGraph = SiteGraph;
exports.SiteConfig = SiteConfig;
exports.UploadStatus = UploadStatus;
