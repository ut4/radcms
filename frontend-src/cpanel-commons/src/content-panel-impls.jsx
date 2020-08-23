import {config} from '@rad-commons';
import ContentNodeList from './ContentNodeList.jsx';

/*
 * Implementoi hallintapaneeliosion <?php $this->fetchOne(...)->addFrontendPanel(
 * ['impl' => 'DefaultSingle'...]) ?> kutsuille, jolla loppukäyttäjä voi muokata
 * sisältöä.
 */
class DefaultImplForFetchOne extends preact.Component {
    /**
     * @param {{panel: FrontendPanelConfig; settings: Object; siteInfo: SiteInfo;}} props
     */
    constructor(props) {
        super(props);
        this.newNodeContentType = props.panel.contentTypeName;
        this.node = props.panel.contentNodes[0] || null;
    }
    getName() {
        return 'DefaultSingle';
    }
    /**
     * @access public
     */
    getMainUrl() {
        return this.node
            ? `/edit-content/${this.node.id}/${this.node.contentType}/${this.props.panel.idx}`
            : `/add-content/${this.newNodeContentType}`;
    }
    getTitle() {
        const isDraft = this.node && this.node.isRevision;
        return [
            `${this.props.panel.title}${!isDraft ? '' : '*'}`,
            this.props.panel.subtitle,
        ];
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
                : [<div>Ei sisältöä filttereillä <pre>{ JSON.stringify(this.props.panel.queryInfo.where, true, 2) }</pre></div>,
                    <a href={ url }>Luo sisältö</a>]
            }</div>;
    }
}

/*
 * Implementoi hallintapaneeliosion <?php $this->fetchAll(...)->addFrontendPanel(
 * ['impl' => 'DefaultCollection'...]) ?> kutsuille.
 */
class DefaultImplForFetchAll extends preact.Component {
    /**
     * @param {{panel: FrontendPanelConfig; settings: Object; siteInfo: SiteInfo;}} props
     */
    constructor(props) {
        super(props);
        this.contentNodes = props.panel.contentNodes;
        this.contentTypeName = props.panel.contentTypeName;
        this.label = '';
    }
    getName() {
        return 'DefaultCollection';
    }
    getMainUrl() {
        return `/manage-content/${this.contentTypeName || (this.contentNodes[0] || {}).contentType}`;
    }
    getTitle() {
        return this.props.panel.title;
    }
    render() {
        return <ContentNodeList
            contentNodes={ this.contentNodes }
            createLinkText={ `Lisää uusi ${this.label}` }
            contentType={ this.contentTypeName || (this.contentNodes[0] || {}).contentType }
            noContentNodesContent={ this.contentNodes.length ? null : <div>Ei sisältöä.</div> }/>;
    }
}

export {DefaultImplForFetchOne, DefaultImplForFetchAll};
