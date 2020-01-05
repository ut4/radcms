import {components} from '../../rad-commons.js';
const {MyLink} = components;
import ContentNodeList from './Content/ContentNodeList.js';

/*
 * Implementoi hallintapaneeliosion <?php $this->fetchOne(...)->createFrontendPanel('Generic', 'My title') ?> kutsuille, jolla loppukäyttäjä voi muokata sisältöä.
 */
class GenericUIPanelImpl extends preact.Component {
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
                    $el(MyLink, {to: this.makeEditUrl(false)}, 'Muokkaa'),
                ),
                this.node.isRevision
                    ? $el('div', null,
                        $el(MyLink, {to: this.makeEditUrl(true)}, 'Julkaise'),
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
    /**
     * @access private
     */
    makeEditUrl(appendPublishSlug) {
        return '/edit-content/' + this.node.id + '/' +
                this.node.contentType + (!appendPublishSlug ? '' : '/publish') +
                '?returnTo=' + encodeURIComponent(this.currentPagePath);
    }
}

/*
 * Implementoi hallintapaneeliosion <?php $this->fetchAll(...)->createFrontendPanel('List', 'My title') ?> kutsuille.
 */
class GenericListUIPanelImpl extends preact.Component {
    /**
     * @param {{dataFromBackend: FrontendPanelConfig; siteInfo: SiteInfo;}} props
     */
    constructor(props) {
        super(props);
        this.contentNodes = props.dataFromBackend.contentNodes;
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
            contentNodes: this.contentNodes,
            createLinkText: 'Lisää uusi ' + this.label,
            currentPagePath: this.currentPagePath,
            contentType: this.contentTypeName || (this.contentNodes[0] || {}).contentType
        });
    }
}

export {GenericUIPanelImpl, GenericListUIPanelImpl};
