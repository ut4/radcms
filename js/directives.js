/*
 * Usage:
 * @arts = fetchAll("Article")
 * <html>
 *     ...
 *     { domTree.createElement(directives.ArticleList, {articles: arts}, null) }
 *     ...
 * </html>
 *
 * With pagination:
 * var paginationOpts = {nthPage: url[1] || 1, limit: 10}
 * @arts = fetchAll("Article").paginate(paginationOpts)
 * <html>
 *     ...
 *     { domTree.createElement(directives.ArticleList, {
 *         articles: arts,
 *         paginationOptions: paginationOpts,
 *         url: url
 *     }, null) }
 *     ...
 * </html>
 *
 * @param {domTree} domTree
 * @param {{articles: {Object[]}, paginationOptions: {Object?}, url: {string[]?}}} props
 */
exports.ArticleList = function(domTree, props) {
    if (props.articles.length) {
        return domTree.createElement('div', null, props.articles.map(function(art) {
            return domTree.createElement('article', null, [
                domTree.createElement('h2', null, art.title),
                domTree.createElement('div', null, [
                    domTree.createElement('p', null, art.body.substr(0, 6) + '... '),
                    domTree.createElement('a', {
                        href: art.defaults.name.charAt(0) !== '/'
                            ? '/' + art.defaults.name
                            : art.defaults.name,
                        layoutFileName: 'article-layout.jsx.htm'
                    }, 'Read more')
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
    if (opts.nthPage > 1) {
        out.push(domTree.createElement('a', {
            href: '/' + props.url[0] + (opts.nthPage > 2 ? ('/' + (opts.nthPage - 1)) : ''),
            layoutFileName: 'main-layout.jsx.htm'
        }, 'Prev'));
    }
    if (!isLast) {
        out.push(domTree.createElement('a', {
            href: '/' + props.url[0] + '/' + (opts.nthPage + 1),
            layoutFileName: 'main-layout.jsx.htm'
        }, 'Next'));
    }
    return domTree.createElement('div', null, out);
}