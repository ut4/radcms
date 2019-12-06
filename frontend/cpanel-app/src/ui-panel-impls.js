import {components} from '../../rad-commons.js';
const {MyLink} = components;
import ContentNodeList from './Content/ContentNodeList.js';

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
        this.newNodeContentType = props.dataFromBackend.contentTypeName;
        this.node = props.dataFromBackend.contentNodes[0] || null;
    }
    getName() {
        return 'Generic';
    }
    getTitle() {
        return $el('span', null,
            this.props.dataFromBackend.title,
            !this.node || !this.node.isRevision
                ? null
                : $el('sup', null, ' (Luonnos)')
        );
    }
    getIcon() {
        return 'file-text';
    }
    render() {
        return this.node
            ? $el('div', null,
                $el('div', null,
                    $el(MyLink, {to: '/edit-content/' + this.node.id + '/' +
                                     this.node.contentType + '?returnTo=' +
                                     encodeURIComponent(this.currentPagePath)},
                        'Muokkaa'),
                ),
                this.node.isRevision
                    ? $el('div', null,
                        $el('a', {onClick: e => this.publishContent(e), href: ''}, 'Julkaise')
                    )
                    : null,
            )
            : $el('div', null,
                $el('span', null, 'Ei sisältöä'),
                $el(MyLink, {to: '/add-content/' + this.newNodeContentType +
                                 '?returnTo=' + encodeURIComponent(this.currentPagePath)},
                    'Luo sisältö')
            );
    }
    publishContent(e) {
        e.preventDefault();
        alert('todo');
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
        this.contentTypeName = props.dataFromBackend.contentTypeName;
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
            createLinkText: 'Lisää uusi ' + this.label,
            currentPagePath: this.currentPagePath,
            contentType: this.contentTypeName || (this.cnodes[0] || {}).contentType
        });
    }
}

export {GenericUIPanelImpl, GenericListUIPanelImpl};
