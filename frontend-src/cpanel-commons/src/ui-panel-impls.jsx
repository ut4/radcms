import ContentNodeList from './ContentNodeList.jsx';

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
        return <span>{ [
            this.props.dataFromBackend.title,
            !this.node || !this.node.isRevision ? null : <sup> (Luonnos)</sup>
        ] }</span>;
    }
    getIcon() {
        return 'file-text';
    }
    render() {
        return this.node
            ? <div>
                <div><a href={ this.makeEditUrl(false) }>Muokkaa</a></div>
                { this.node.isRevision
                    ? <div><a href={ this.makeEditUrl(true) }>Julkaise</a></div>
                    : null }
            </div>
            : <div>
                <span>Ei sisältöä</span>
                <a href={ '#/add-content/' + this.newNodeContentType +
                          '?returnTo=' + encodeURIComponent(this.currentPagePath) }>
                    Luo sisältö</a>
            </div>;
    }
    /**
     * @access private
     */
    makeEditUrl(appendPublishSlug) {
        return '#/edit-content/' + this.node.id + '/' +
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
        return <ContentNodeList
            contentNodes={ this.contentNodes }
            createLinkText={ `Lisää uusi ${this.label}` }
            currentPagePath={ this.currentPagePath }
            contentType={ this.contentTypeName || (this.contentNodes[0] || {}).contentType }/>;
    }
}

export {GenericUIPanelImpl, GenericListUIPanelImpl};
