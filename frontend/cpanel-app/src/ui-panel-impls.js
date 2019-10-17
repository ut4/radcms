import {view, myLink, contentNodeList} from '../../src/common-components.js';

/*
 * Implementoi hallintapaneeliosion <?php $this->fetchAll(...)->createFrontendPanel('Generic', 'My title') ?> kutsuille, jonka kautta loppukäyttäjä voi muokata sisältöä.
 */
class GenericUIPanelImpl {
    /**
     * @param {FrontendPanelConfig} config
     */
    constructor(config) {
        this.type = 'Generic';
        this.config = config;
        if (config.contentNodes.length) {
            this.cnodeId = config.contentNodes[0].id;
            this.cnodeName = config.contentNodes[0].name;
        } else {
            this.cnodeId = 0;
        }
    }
    getRoutes() {
        return [];
    }
    getTitle() {
        return this.config.title;
    }
    getIcon() {
        return this.config.icon || 'layers';
    }
    /**
     * @param {Object} ctx
     */
    getMenuItems(ctx) {
        return this.cnodeId
        ? [
            $el('span', null, this.cnodeName),
            myLink('/edit-content/' + this.cnodeId + '?returnTo=' +
                   encodeURIComponent(ctx.currentPageData.page.url), 'Edit')
        ]
        : [
            $el('span', null, 'No content'),
            myLink('/add-content' + '?returnTo=' + encodeURIComponent(ctx.currentPageData.page.url), 'Create')
        ];
    }
}

/*
 * Implementoi hallintapaneeliosion <?php $this->fetchAll(...)->createFrontendPanel('List', 'My title') ?> kutsuille.
 */
class GenericListUIPanelImpl {
    /**
     * @param {FrontendPanelConfig} config
     */
    constructor(config) {
        this.type = 'List';
        this.config = config;
    }
    getRoutes() {
        return [];
    }
    getTitle() {
        return this.config.title;
    }
    getIcon() {
        return this.config.icon || 'layers';
    }
    /**
     * @param {Object} ctx
     */
    getMenuItems(ctx) {
        return contentNodeList({
            cnodes: this.config.contentNodes,
            createLinkText: 'Add ' + this.label,
            currentPageUrl: ctx.currentPageData.page.url,
            contentType: this.config.contentType
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
 * Implementoi hallintapaneeliosion <?php $this->fetchAll(...)->createFrontendPanel('StaticMenu', 'My menu') ?> kutsuille.
 */
class StaticMenuUIPanelImpl {
    /**
     * @see GenericListUIPanelImpl
     */
    constructor(config) {
        this.type = 'StaticMenu';
        this.config = config;
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
        return this.config.contentNodes.map(article => {
            return $el('span', null, article.title);
        }).concat(myLink('/static-menu-add-page', 'Add page'));
    }
}

export {GenericUIPanelImpl, GenericListUIPanelImpl, StaticMenuUIPanelImpl};
