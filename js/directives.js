var website = require('website.js');

/*
 * Usage:
 * <html>
 *     ...
 *     <RadLink to="/page" text="Read more" domAttr1="foo" another="bar"/>
 *     ...
 * </html>
 */
exports.RadLink = function(domTree, props) {
    if (!props.to) throw new TypeError('<RadLink to=""/> can\'t be empty');
    else if (props.to == '/') props.to = website.siteConfig.homeUrl;
    else if (props.to.charAt(0) != '/') props.to = '/' + props.to;
    //
    var p = {href: props.to};
    for (var key in props) {
        if (key != 'to' && key != 'text' && key != 'layoutOverride') p[key] = props[key];
    }
    return domTree.createElement('a', p, props.text || '');
};

/*
 * Usage:
 * @arts = fetchAll("Article")
 * <html>
 *     ...
 *     <RadArticleList articles={arts}/>
 *     ...
 * </html>
 *
 * With pagination:
 * var opts = {nthPage: url[1] || 1, limit: 10}
 * @arts = fetchAll("Article").paginate(opts)
 * <html>
 *     ...
 *     <RadArticleList articles={arts} paginationOptions={opts} url={url}/>
 *     ...
 * </html>
 */
exports.RadArticleList = function(domTree, props) {
    if (props.articles.length) {
        return domTree.createElement('div', null, props.articles.map(function(art) {
            return domTree.createElement('article', null, [
                domTree.createElement('h2', null, art.title),
                domTree.createElement('div', null, [
                    domTree.createElement('p', null, art.body.substr(0, 6) + '... '),
                    domTree.createElement(exports.RadLink, {
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
        out.push(domTree.createElement(exports.RadLink, {
            to: '/' + props.url[0] + (opts.nthPage > 2 ? ('/' + (opts.nthPage - 1)) : ''),
            layoutOverride: currentPage.layoutFileName,
            text: 'Prev'
        }, null));
    }
    if (!isLast) {
        out.push(domTree.createElement(exports.RadLink, {
            to: '/' + props.url[0] + '/' + (opts.nthPage + 1),
            layoutOverride: currentPage.layoutFileName,
            text: 'Next'
        }, null));
    }
    return domTree.createElement('div', null, out);
}