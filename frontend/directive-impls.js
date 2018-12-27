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
    static getMenuItems(directive) {
        return directive.components.map(article => {
            return $el('div', null, [
                $el('span', null, article.title),
                $el('a', {href:'#/edit-component', onClick: e => {
                    e.preventDefault();
                    myRedirect('/edit-component');
                }}, 'Edit')
            ])
        }).concat([
            $el('a', {
                href:'#/add-component/Article',
                onClick: e => {
                    e.preventDefault();
                    myRedirect('/add-component/Article');
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
                $el('button', {onClick: e => myRedirect('/')}, 'x')
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
    static getMenuItems(directive) {
        return directive.components.map(article => {
            return $el('span', null, article.title)
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
