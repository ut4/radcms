/*
 * Implements end-user management views (editing articles, creating new articles
 * etc.) for <ArticleList/> directives.
 */
class ArticleListDirectiveWebUIImpl extends preact.Component {
    static getRoutes() {
        return [];
    }
    static getTitle() {
        return 'Article list';
    }
    /**
     * @param {{type: {string}, contentNodes: {Object[]}}} directive
     */
    static getMenuItems(directive) {
        return directive.contentNodes.map(article => {
            return $el('div', null, [
                $el('span', null, article.title),
                $el('a', {href:'#/edit-content', onClick: e => {
                    e.preventDefault();
                    myRedirect('/edit-content');
                }}, 'Edit')
            ]);
        }).concat([
            $el('a', {
                href:'#/add-content/Article',
                onClick: e => {
                    e.preventDefault();
                    myRedirect('/add-content/Article');
                }
            }, 'Add article')
        ]);
    }
}

class StaticMenuAddPageView {
    render() {
        return $el('div', {className: 'view'},
            $el('div', null, [
                $el('p', null, '...'),
                $el('button', {onClick: () => myRedirect('/')}, 'x')
            ])
        );
    }
}
/*
 * Implements end-user management views (adding links, reordering links etc.)
 * for <StaticMenu/> directives.
 */
class StaticMenuDirectiveWebUIImpl extends preact.Component {
    static getRoutes() {
        return [
            $el(StaticMenuAddPageView, {path: '/static-menu-add-page'}, null)
        ];
    }
    static getTitle() {
        return 'Static menu';
    }
    /**
     * @param {{type: {string}, contentNodes: {Object[]}}} directive
     */
    static getMenuItems(directive) {
        return directive.contentNodes.map(article => {
            return $el('span', null, article.title);
        }).concat([
            $el('a', {
                href:'#static-menu-add-page',
                onClick: e => {
                    e.preventDefault();
                    myRedirect('/static-menu-add-page');
                }
            }, 'Add page')
        ]);
    }
}

export {ArticleListDirectiveWebUIImpl, StaticMenuDirectiveWebUIImpl};
