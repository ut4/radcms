import {http, env, toasters, View, FeatherSvg, urlUtils} from '@rad-commons';
import {ContentNodeUtils} from '@rad-cpanel-commons';
import openDeleteContentDialog from './ContentDeleteDialog.jsx';
import ContentTypeDropdown from '../ContentType/ContentTypeDropdown.jsx';

/**
 * #/manage-content/:initialContentTypeName.
 */
class ContentManageView extends preact.Component {
    /**
     * @param {{initialContentTypeName?: string;}} props
     */
    constructor(props) {
        super(props);
        this.state = {isFetching: true, contentTypeName: null, content: null};
        this.contentTypes = null;
        let contentTypeName = null;
        http.get('/api/content-types')
            .then(contentTypes => {
                this.contentTypes = contentTypes;
                contentTypeName = props.initialContentTypeName || contentTypes[0].name;
                return this.fetchContent(contentTypeName);
            })
            .then(content => {
                if (!props.initialContentTypeName)
                    urlUtils.replace(`#/manage-content/${contentTypeName}`);
                return this.setState({content, isFetching: false, contentTypeName});
            })
            .catch(err => {
                toasters.main('Jokin meni pieleen', 'error');
                env.console.error(err);
            });
    }
    /**
     * @access protected
     */
    render() {
        if (this.state.isFetching && !this.state.content)
            return null;
        return <View>
            <h2>Selaa sisältöä</h2>
            <div class="col-centered columns container">
                <ContentTypeDropdown
                    initialValue={ this.state.contentTypeName }
                    contentTypes={ this.contentTypes }
                    onSelected={ type => this.reFetchContent(type.name) }/>
                <a href={ `#/add-content/${this.state.contentTypeName}?return-to=/manage-content/${this.state.contentTypeName}` } title="Luo uusi" class="px-2 col-mr-auto">
                    <FeatherSvg iconId="plus-circle" className="medium"/>
                </a>
            </div>
            { this.state.content.length ? <table class="table">
                <thead><tr>
                    <th>#</th>
                    <th>Julkaistu</th>
                    <th class="buttons"></th>
                </tr></thead>
                <tbody>{ this.state.content.map(cnode => {
                    const basePath = `#/edit-content/${cnode.id}/${cnode.contentType}/none`;
                    const qs = `?return-to=/manage-content/${this.state.contentTypeName}`;
                    return <tr>
                        <td>{ ContentNodeUtils.makeTitle(cnode) }</td>
                        <td>{ !cnode.isRevision
                            ? 'Kyllä'
                            : ['Ei, ', <a href={ `${basePath}/publish${qs}` }>Julkaise</a>]
                        }</td>
                        <td class="buttons">
                            <a href={ `${basePath}${qs}` } title="Muokkaa">
                                <FeatherSvg iconId="edit-2" className="feather-md"/>
                            </a> <a onClick={ e => this.openDeleteDialog(e, cnode) }
                                    href={ `#/delete-content/${cnode.id}` } class="m-2" title="Poista">
                                <FeatherSvg iconId="trash-2" className="feather-md"/>
                            </a>
                        </td>
                    </tr>;
                }) }</tbody>
            </table> : <p>Ei sisältöä sisältötyypille { (this.contentTypes.find(t => t.name === this.state.contentTypeName)).friendlyName }</p> }
        </View>;
    }
    /**
     * @access private
     */
    fetchContent(contentTypeName) {
        return http.get(`/api/content/${contentTypeName}`)
            .catch(err => {
                toasters.main('Jokin meni pieleen', 'error');
                env.console.error(err);
                return null;
            });
    }
    /**
     * @access private
     */
    reFetchContent(contentTypeName) {
        this.setState({isFetching: true});
        this.fetchContent(contentTypeName).then(content => {
            this.setState({content, isFetching: false, contentTypeName});
            urlUtils.replace(`#/manage-content/${contentTypeName}`);
        });
    }
    /**
     * @access private
     */
    openDeleteDialog(e, cnode) {
        e.preventDefault();
        openDeleteContentDialog(cnode, null);
    }
}

export default ContentManageView;
