import {config} from '@rad-commons';
import ContentNodeList from './ContentNodeList.jsx';

/*
 * Implementoi hallintapaneeliosion <?php $this->fetchOne(...)->addFrontendPanel('Generic', 'My title') ?> kutsuille, jolla loppukäyttäjä voi muokata sisältöä.
 */
class GenericUIPanelImpl extends preact.Component {
    /**
     * @param {{dataFromBackend: FrontendPanelConfig; siteInfo: SiteInfo;}} props
     */
    constructor(props) {
        super(props);
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
            ? `/edit-content/${this.node.id}/${this.node.contentType}`
            : `/add-content/${this.newNodeContentType}`;
    }
    getTitle() {
        const {title, subTitle} = this.props.dataFromBackend;
        const isDraft = this.node && this.node.isRevision;
        return <span title={
            title +
            (subTitle ? ` (${subTitle})` : '') +
            (isDraft ? ` (Luonnos)` : '')
        }>{ [
            title,
            isDraft ? <i class="note">(Luonnos)</i> : null,
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
                <a href={ url }>Muokkaa</a>
                { this.node.isRevision
                    ? <a href={ `${url}/publish` }>Julkaise</a>
                    : null }
            </div>
            : <div>{ !config.userPermissions.canConfigureContent
                ? [<div>Devaaja ei ole vielä luonut tätä sisältöä.</div>]
                : [<div>Ei sisältöä filttereillä <pre>{ JSON.stringify(this.props.dataFromBackend.queryInfo.where, true, 2) }</pre></div>,
                    <a href={ url }>Luo sisältö</a>]
            }</div>;
    }
}

/*
 * Implementoi hallintapaneeliosion <?php $this->fetchAll(...)->addFrontendPanel('List', 'My title') ?> kutsuille.
 */
class GenericListUIPanelImpl extends preact.Component {
    /**
     * @param {{dataFromBackend: FrontendPanelConfig; siteInfo: SiteInfo;}} props
     */
    constructor(props) {
        super(props);
        this.contentNodes = props.dataFromBackend.contentNodes;
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
            contentType={ this.contentTypeName || (this.contentNodes[0] || {}).contentType }
            noContentNodesContent={ this.contentNodes.length ? null : <div>Ei sisältöä.</div> }/>;
    }
}

export {GenericUIPanelImpl, GenericListUIPanelImpl};
