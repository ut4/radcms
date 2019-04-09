/**
 * # directives.js
 *
 * This file contains the default template directives (<RadLink/>,
 * <RadList/> etc.). init() adds them to $commons.templateCache.
 *
 */
const {app} = require('./app.js');
const {templateCache} = require('./templating');

/**
 * Usage:
 * <html>
 *     ...
 *     <RadLink to="/page" text="Read more" domAttr1="foo" another="bar"/>
 *     ...
 * </html>
 *
 * @param {{
 *     to: string;
 *     text: string;
 * }} props
 * @param {DomTree} domTree
 */
function Link(props, domTree) {
    if (!props.to) throw new TypeError('<RadLink to=""/> is required');
    else if (props.to == '/') props.to = app.currentWebsite.config.homeUrl;
    else if (props.to.charAt(0) != '/') props.to = '/' + props.to;
    //
    const p = {href: props.to};
    for (const key in props) {
        if (key !== 'to' && key !== 'text' && key !== 'layoutOverride') p[key] = props[key];
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
 * @param {{
 *     items: Object[];
 *     contentType: string;
 *     listFn: (items: Object[]): JsxElem;
 *     noItemsFn?: (void): JsxElem;
 *     contentTypeLabel?: string?; eg. 'Book'
 *     icon?: string; eg. 'activity' (see: feathericons.com)
 * }} props
 * @param {DomTree} domTree
 */
function List(props, domTree) {
    if (!props.listFn) throw new TypeError('<RadList listFn={}/> is required');
    if (!props.contentType) throw new TypeError('<RadList contentType=""/> is required');
    if (!props.noItemsFn) props.noItemsFn = () =>
        domTree.createElement('div', null, 'No items found.');
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
 * const opts = {nthPage: url[1] || 1, limit: 10}
 * @arts = fetchAll("Article").paginate(opts).exec()
 * <html>
 *     ...
 *     <RadArticleList articles={arts} paginationOptions={opts} url={url}/>
 *     ...
 * </html>
 *
 * @param {{
 *     articles: Object[];
 *     url: string;
 *     paginationOptions?: {nthPage: number; limit: number;};
 * }} props
 * @param {DomTree} domTree
 */
function ArticleList(props, domTree) {
    if (props.articles.length) {
        return domTree.createElement('div', null, props.articles.map(art =>  {
            return domTree.createElement('article', null, [
                domTree.createElement('h2', null, art.title),
                domTree.createElement('div', null, [
                    domTree.createElement('p', null, art.body.substr(0, 6) + '... '),
                    domTree.createElement(templateCache.get('RadLink'), {
                        to: art.defaults.name.charAt(0) !== '/'
                            ? '/' + art.defaults.name
                            : art.defaults.name,
                        layoutOverride: props.layout || 'article-layout.jsx.htm',
                        text: 'Read more'
                    }, null)
                ])
            ]);
        }).concat(buildPaginationLinks(props, domTree, false)));
    }
    return domTree.createElement('div', null, [
        domTree.createElement('div', null, 'No articles found.'),
    ].concat(buildPaginationLinks(props, domTree, true)));
}

function buildPaginationLinks(props, domTree, isLast) {
    const opts = props.paginationOptions;
    if (!opts) return [''];
    const out = [];
    const currentPage = domTree.currentPage;
    if (opts.nthPage > 1) {
        out.push(domTree.createElement(templateCache.get('RadLink'), {
            to: '/' + props.url[0] + (opts.nthPage > 2 ? ('/' + (opts.nthPage - 1)) : ''),
            layoutOverride: currentPage.layoutFileName,
            text: 'Prev'
        }, null));
    }
    if (!isLast) {
        out.push(domTree.createElement(templateCache.get('RadLink'), {
            to: '/' + props.url[0] + '/' + (opts.nthPage + 1),
            layoutOverride: currentPage.layoutFileName,
            text: 'Next'
        }, null));
    }
    return domTree.createElement('div', null, out);
}

exports.init = () => {
    templateCache.put('RadLink', Link);
    templateCache.put('RadList', List);
    templateCache.put('RadArticleList', ArticleList);
    exports.init = () => {};
};
