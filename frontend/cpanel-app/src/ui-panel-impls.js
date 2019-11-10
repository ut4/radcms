import {MyLink, ContentNodeList} from '../../src/common-components.js';

/*
 * Implementoi hallintapaneeliosion <?php $this->fetchOne(...)->createFrontendPanel('Generic', 'My title') ?> kutsuille, jolla loppukäyttäjä voi muokata sisältöä.
 */
class GenericUIPanelImpl extends preact.Component {
    static getRoutes() {
        return [];
    }
    /**
     * @param {{dataFromBackend: FrontendPanelConfig; siteInfo: SiteInfo;}} props
     */
    constructor(props) {
        super(props);
        this.currentPagePath = props.siteInfo.currentPagePath;
        if ((this.node = props.dataFromBackend.contentNodes[0] || null))
            this.nodeName = this.node.name || '#' + this.node.id;
    }
    getName() {
        return 'Generic';
    }
    getTitle() {
        return this.props.dataFromBackend.title;
    }
    getIcon() {
        return 'file-text';
    }
    render() {
        return this.node
            ? $el('div', null,
                $el('span', null, this.nodename),
                $el(MyLink, {to: '/edit-content/' + this.node.id + '/' + this.node.contentType + '?returnTo=' +
                    encodeURIComponent(this.currentPagePath)}, 'Edit')
            )
            : $el('div', null,
                $el('span', null, 'No content'),
                $el(MyLink, {to: '/add-content?returnTo=' + encodeURIComponent(this.currentPagePath)}, 'Create')
            );
    }
}

/*
 * Implementoi hallintapaneeliosion <?php $this->fetchAll(...)->createFrontendPanel('List', 'My title') ?> kutsuille.
 */
class GenericListUIPanelImpl extends preact.Component {
    static getRoutes() {
        return [];
    }
    /**
     * @param {{dataFromBackend: FrontendPanelConfig; siteInfo: SiteInfo;}} props
     */
    constructor(props) {
        super(props);
        this.cnodes = props.dataFromBackend.contentNodes;
        this.currentPagePath = props.siteInfo.currentPagePath;
        this.label = '';
    }
    getName() {
        return 'List';
    }
    getTitle() {
        return this.props.dataFromBackend.title;
    }
    getIcon() {
        return 'layers';
    }
    render() {
        return $el(ContentNodeList, {
            cnodes: this.cnodes,
            createLinkText: 'Add ' + this.label,
            currentPagePath: this.currentPagePath,
            contentType: (this.cnodes[0] || {}).contentType
        });
    }
}

export {GenericUIPanelImpl, GenericListUIPanelImpl};
