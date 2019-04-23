import {view, myLink, contentNodeList} from './common-components.js';

/*
 * Implements end-user management views (editing items, creating new items
 * etc.) for <RadList/> directive elements.
 */
class GenericListUIPanelImpl {
    /**
     * @param {{contentType: string; contentNodes: Array<Object>; uiPanelType: string; [any]: string;}} directiveElem
     */
    constructor(directiveElem) {
        this.dir = directiveElem;
        this.label = this.dir.contentTypeLabel || this.dir.contentType;
    }
    getRoutes() {
        return [];
    }
    getTitle() {
        return this.label + ' list';
    }
    getIcon() {
        return this.dir.icon || 'layers';
    }
    /**
     * @param {Object} ctx
     */
    getMenuItems(ctx) {
        return contentNodeList({
            cnodes: this.dir.contentNodes,
            createLinkText: 'Add ' + this.label,
            currentPageUrl: ctx.currentPageData.page.url,
            contentType: this.dir.contentType
        });
    }
}

class StaticMenuAddPageView {
    render() {
        return view($el('div', null, [
            $el('p', null, '...'),
            $el('button', {onClick: () => myRedirect('/')}, 'x')
        ]));
    }
}

/*
 * Implements end-user management views (adding links, reordering links etc.)
 * for <RadStaticMenu/> directives.
 */
class StaticMenuUIPanelImpl {
    /**
     * @see GenericListUIPanelImpl
     */
    constructor(directiveElem) {
        this.dir = directiveElem;
    }
    getRoutes() {
        return [
            $el(StaticMenuAddPageView, {path: '/static-menu-add-page'}, null)
        ];
    }
    getTitle() {
        return 'Static menu';
    }
    getIcon() {
        return 'list';
    }
    /**
     * @param {Object} ctx
     */
    getMenuItems() {
        return this.dir.contentNodes.map(article => {
            return $el('span', null, article.title);
        }).concat(myLink('/static-menu-add-page', 'Add page'));
    }
}

export {GenericListUIPanelImpl, StaticMenuUIPanelImpl};
