/**
 * == website.js ====
 *
 * In this file:
 *
 * - Website (class)
 * - SiteGraph (class)
 *
 */
var commons = require('common-services.js');
var documentData = require('document-data.js');
var crypto = require('crypto.js');

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

exports.NOT_UPLOADED = 0;
exports.OUTDATED = 1;
exports.UPLOADED = 2;
exports.DELETED = 3;