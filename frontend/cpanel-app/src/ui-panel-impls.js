import {myLink, contentNodeList} from '../../src/common-components.js';

/*
 * Implementoi hallintapaneeliosion <?php $this->fetchAll(...)->createFrontendPanel('Generic', 'My title') ?> kutsuille, jonka kautta loppukäyttäjä voi muokata sisältöä.
 */
class GenericUIPanelImpl {
    /**
     * @param {FrontendPanelConfig} config
     */
    constructor(config) {
        this.config = config;
        if (config.contentNodes.length) {
            this.cnodeId = config.contentNodes[0].id;
            this.cnodeName = config.contentNodes[0].name;
        } else {
            this.cnodeId = 0;
        }
    }
    getName() {
        return 'Generic';
    }
    getTitle() {
        return this.config.title;
    }
    getIcon() {
        return this.config.icon || 'layers';
    }
    getRoutes() {
        return [];
    }
    /**
     * @param {Object} currentPageData
     */
    getMenuItems(currentPageData) {
        return this.cnodeId
        ? [
            $el('span', null, this.cnodeName),
            myLink('/edit-content/' + this.cnodeId + '?returnTo=' +
                   encodeURIComponent(currentPageData.page.url), 'Edit')
        ]
        : [
            $el('span', null, 'No content'),
            myLink('/add-content' + '?returnTo=' + encodeURIComponent(currentPageData.page.url), 'Create')
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
        this.config = config;
    }
    getName() {
        return 'List';
    }
    getTitle() {
        return this.config.title;
    }
    getIcon() {
        return this.config.icon || 'layers';
    }
    getRoutes() {
        return [];
    }
    /**
     * @param {Object} currentPageData
     */
    getMenuItems(currentPageData) {
        return contentNodeList({
            cnodes: this.config.contentNodes,
            createLinkText: 'Add ' + this.label,
            currentPageUrl: currentPageData.page.url,
            contentType: this.config.contentType
        });
    }
}

export {GenericUIPanelImpl, GenericListUIPanelImpl};
