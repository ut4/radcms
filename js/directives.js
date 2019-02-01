var website = require('website.js');

/*
 * Usage:
 * <html>
 *     ...
 *     <directives.Link to="/page" text="Read more" domAttr1="foo" another="bar"/>
 *     ...
 * </html>
 */
exports.Link = function(domTree, props) {
    if (!props.to) throw new TypeError('<Link to=""/> can\'t be empty');
    else if (props.to == '/') props.to = website.siteConfig.homeUrl;
    //
    var p = {href: props.to};
    for (var key in props) if (key != 'to' && key != 'text') p[key] = props[key];
    return domTree.createElement('a', p, props.text || '');
};

/*
 * Usage:
 * @arts = fetchAll("Article")
 * <html>
 *     ...
 *     <directives.ArticleList name="WhatsNew" articles={ arts }/>
 *     ...
 * </html>
 *
 * With pagination:
 * var paginationOpts = {nthPage: url[1] || 1, limit: 10}
 * @arts = fetchAll("Article").paginate(paginationOpts)
 * <html>
 *     ...
 *     <directives.ArticleList
 *         name="PostsListing"
 *         articles={ arts }
 *         paginationOptions={ paginationOpts }
 *         url={ url }/>
 *     ...
 * </html>
 */
exports.ArticleList = function(domTree, props) {
    if (!props.name) throw new TypeError('ArticleList must have a name.');
    if (props.articles.length) {
        return domTree.createElement('div', null, props.articles.map(function(art) {
            return domTree.createElement('article', null, [
                domTree.createElement('h2', null, art.title),
                domTree.createElement('div', null, [
                    domTree.createElement('p', null, art.body.substr(0, 6) + '... '),
                    domTree.createElement(exports.Link, {
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
};

function buildPaginationLinks(domTree, props, isLast) {
    var opts = props.paginationOptions;
    if (!opts) return [''];
    var out = [];
    var currentPage = domTree.getContext();
    if (opts.nthPage > 1) {
        out.push(domTree.createElement(exports.Link, {
            to: '/' + props.url[0] + (opts.nthPage > 2 ? ('/' + (opts.nthPage - 1)) : ''),
            layoutOverride: currentPage.layoutFileName,
            text: 'Prev'
        }, null));
    }
    if (!isLast) {
        out.push(domTree.createElement(exports.Link, {
            to: '/' + props.url[0] + '/' + (opts.nthPage + 1),
            layoutOverride: currentPage.layoutFileName,
            follow: true,
            text: 'Next'
        }, null));
    }
    return domTree.createElement('div', null, out);
}