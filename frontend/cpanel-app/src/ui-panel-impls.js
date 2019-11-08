import {myLink, contentNodeList} from '../../src/common-components.js';

/*
 * Implementoi hallintapaneeliosion <?php $this->fetchOne(...)->createFrontendPanel('Generic', 'My title') ?> kutsuille, jonka kautta loppukäyttäjä voi muokata sisältöä.
 */
class GenericUIPanelImpl {
    /**
     * @param {FrontendPanelConfig} config
     */
    constructor(config) {
        this.config = config;
        if ((this.node = config.contentNodes[0] || null))
            this.nodeName = this.node.name || '#' + this.node.id;
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
     * @param {Object} cpanelProps
     */
    getMenuItems(cpanelProps) {
        return this.node
        ? [
            $el('span', null, this.nodename),
            myLink('/edit-content/' + this.node.id + '/' + this.node.contentType + '?returnTo=' +
                   encodeURIComponent(cpanelProps.currentPagePath), 'Edit')
        ]
        : [
            $el('span', null, 'No content'),
            myLink('/add-content?returnTo=' + encodeURIComponent(cpanelProps.currentPagePath), 'Create')
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
     * @param {Object} cpanelProps
     */
    getMenuItems(cpanelProps) {
        return contentNodeList({
            cnodes: this.config.contentNodes,
            createLinkText: 'Add ' + this.label,
            currentPagePath: cpanelProps.currentPagePath,
            contentType: this.config.contentType
        });
    }
}

export {GenericUIPanelImpl, GenericListUIPanelImpl};
