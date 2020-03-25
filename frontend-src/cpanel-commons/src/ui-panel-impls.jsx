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
    /**
     * @access public
     */
    getMainUrl() {
        return this.node
            ? '/edit-content/' + this.node.id + '/' +
              this.node.contentType + (!this.node.isRevision ? '' : '/publish') +
              '?returnTo=' + encodeURIComponent(this.currentPagePath)
            : '/add-content/' + this.newNodeContentType +
              '?returnTo=' + encodeURIComponent(this.currentPagePath);
    }
    getTitle() {
        const {title, subTitle} = this.props.dataFromBackend;
        const isDraft = !this.node || !this.node.isRevision;
        return <span title={
            title +
            (subTitle ? ` (${subTitle})` : '') +
            (isDraft ? ` (Luonnos)` : '')
        }>{ [
            title,
            isDraft ? <i class="draft"> (Luonnos)</i> : null,
            subTitle ? <i class="subtitle">{ subTitle }</i> : null,
        ] }</span>;
    }
    getIcon() {
        return 'file-text';
    }
    render() {
        const url = `#${this.getMainUrl()}`;
        return this.node
            ? <div>
                <div><a href={ url }>Muokkaa</a></div>
                { this.node.isRevision
                    ? <div><a href={ url }>Julkaise</a></div>
                    : null }
            </div>
            : <div>
                <div class="content">Ei sisältöä</div>
                <a href={ url }>Luo sisältö</a>
            </div>;
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
    getMainUrl() {
        return `/manage-content/${this.contentTypeName || (this.contentNodes[0] || {}).contentType}`;
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
            contentType={ this.contentTypeName || (this.contentNodes[0] || {}).contentType }
            noContentNodesContent={ this.contentNodes.length ? null : <div class="content">Ei sisältöä.</div> }/>;
    }
}

export {GenericUIPanelImpl, GenericListUIPanelImpl};
