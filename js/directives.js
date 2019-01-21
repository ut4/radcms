/*
 * domTree.createElement(ArticleList, {articles: ...}, null)
 */
exports.ArticleList = function(domTree, props) {
    return domTree.createElement('div', null, props.articles.map(function(article) {
        return domTree.createElement('article', null, [
            domTree.createElement('h2', null, article.title),
            domTree.createElement('div', null, [
                domTree.createElement('p', null, article.body.substr(0, 6) + '... '),
                domTree.createElement('a', {
                    href: article.cmp.name.charAt(0) !== '/'
                        ? '/' + article.cmp.name
                        : article.cmp.name,
                    layoutFileName: 'article-layout.jsx.htm'
                }, 'Read more')
            ])
        ]);
    }));
};
