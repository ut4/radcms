import {contentNodeList} from './common-components.js';

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
     * @param {{type: string; contentNodes: Object[]; origin: string;}} directive
     * @param {Object} ctx
     */
    static getMenuItems(directive, ctx) {
        return contentNodeList({
            cnodes: directive.contentNodes,
            createLinkText: 'Add Article',
            currentPageUrl: ctx.currentPageData.page.url,
            contentType: 'Article',
            urlToRescanAfterSubmit: directive.origin
        });
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
     * @param {{type: string; contentNodes: Object[];}} directive
     * @param {Object} ctx
     */
    static getMenuItems(directive) {
        return directive.contentNodes.map(article => {
            return $el('span', null, article.title);
        }).concat($el('a', {
            href:'#static-menu-add-page',
            onClick: e => {
                e.preventDefault();
                myRedirect('/static-menu-add-page');
            }
        }, 'Add page'));
    }
}

export {ArticleListDirectiveWebUIImpl, StaticMenuDirectiveWebUIImpl};
