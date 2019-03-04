/**
 * == directives.js ====
 *
 * This file contains all standard template directives (<RadLink/>,
 * <RadList/> etc.). init() adds them to $commons.templateCache.
 *
 */
var website = require('website.js');
var templates = require('common-services.js').templateCache;

exports.init = function() {
    templates.put('RadLink', Link);
    templates.put('RadList', List);
    templates.put('RadArticleList', ArticleList);
    exports.init = function() {};
};

/**
 * Usage:
 * <html>
 *     ...
 *     <RadLink to="/page" text="Read more" domAttr1="foo" another="bar"/>
 *     ...
 * </html>
 *
 * @param {DomTree} domTree
 * @param {{
 *     to: string;
 *     text: string;
 * }} props
 */
function Link(domTree, props) {
    if (!props.to) throw new TypeError('<RadLink to=""/> is required');
    else if (props.to == '/') props.to = website.siteConfig.homeUrl;
    else if (props.to.charAt(0) != '/') props.to = '/' + props.to;
    //
    var p = {href: props.to};
    for (var key in props) {
        if (key != 'to' && key != 'text' && key != 'layoutOverride') p[key] = props[key];
    }
    return domTree.createElement('a', p, props.text || '');
}

/**
 * Usage:
 * @books = fetchAll("Book").exec()
 * <html>
 *     ...
 *     <RadList items={ books } contentType="Book" listFn={function(books) {
 *         return <div>{books.map(function(book) {
 *             return <div>{ book.title }...</div>
 *         })}</div>
 *     }} noItemsFn={function() {
 *         return <div>No books found.</div>
 *     }}/>
 *     ...
 * </html>
 *
 * @param {DomTree} domTree
 * @param {{
 *     items: Object[];
 *     contentType: string;
 *     listFn: (items: Object[]): JsxElem;
 *     noItemsFn?: (void): JsxElem;
 *     contentTypeLabel?: string?; eg. 'Book'
 *     icon?: string; eg. 'activity' (see: feathericons.com)
 * }} props
 */
function List(domTree, props) {
    if (!props.listFn) throw new TypeError('<RadList listFn={}/> is required');
    if (!props.contentType) throw new TypeError('<RadList contentType=""/> is required');
    if (!props.noItemsFn) props.noItemsFn = function() {
        return domTree.createElement('div', null, 'No items found.');
    };
    return props.items.length ? props.listFn(props.items) : props.noItemsFn();
}

/**
 * Usage:
 * @arts = fetchAll("Article").exec()
 * <html>
 *     ...
 *     <RadArticleList articles={arts}/>
 *     ...
 * </html>
 *
 * With pagination:
 * var opts = {nthPage: url[1] || 1, limit: 10}
 * @arts = fetchAll("Article").paginate(opts).exec()
 * <html>
 *     ...
 *     <RadArticleList articles={arts} paginationOptions={opts} url={url}/>
 *     ...
 * </html>
 *
 * @param {DomTree} domTree
 * @param {{
 *     articles: Object[];
 *     url: string;
 *     paginationOptions?: {nthPage: number; limit: number;};
 * }} props
 */
function ArticleList(domTree, props) {
    if (props.articles.length) {
        return domTree.createElement('div', null, props.articles.map(function(art) {
            return domTree.createElement('article', null, [
                domTree.createElement('h2', null, art.title),
                domTree.createElement('div', null, [
                    domTree.createElement('p', null, art.body.substr(0, 6) + '... '),
                    domTree.createElement(templates.get('RadLink'), {
                        to: art.defaults.name.charAt(0) !== '/'
                            ? '/' + art.defaults.name
                            : art.defaults.name,
                        layoutOverride: props.layout || 'article-layout.jsx.htm',
                        text: 'Read more'
                    }, null)
                ])
            ]);
        }).concat(buildPaginationLinks(domTree, props, false)));
    }
    return domTree.createElement('div', null, [
        domTree.createElement('div', null, 'No articles found.'),
    ].concat(buildPaginationLinks(domTree, props, true)));
}

function buildPaginationLinks(domTree, props, isLast) {
    var opts = props.paginationOptions;
    if (!opts) return [''];
    var out = [];
    var currentPage = domTree.currentPage;
    if (opts.nthPage > 1) {
        out.push(domTree.createElement(templates.get('RadLink'), {
            to: '/' + props.url[0] + (opts.nthPage > 2 ? ('/' + (opts.nthPage - 1)) : ''),
            layoutOverride: currentPage.layoutFileName,
            text: 'Prev'
        }, null));
    }
    if (!isLast) {
        out.push(domTree.createElement(templates.get('RadLink'), {
            to: '/' + props.url[0] + '/' + (opts.nthPage + 1),
            layoutOverride: currentPage.layoutFileName,
            text: 'Next'
        }, null));
    }
    return domTree.createElement('div', null, out);
}