import {http, services, toasters, View, FeatherSvg, InputGroup} from '@rad-commons';
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
                return this.setState({content, isFetching: false, contentTypeName});
            })
            .catch(err => {
                toasters.main('Jokin meni pieleen', 'error');
                services.console.error(err);
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
            <InputGroup>
                <ContentTypeDropdown
                    initialValue={ this.state.contentTypeName }
                    contentTypes={ this.contentTypes }
                    onSelected={ type => this.reFetchContent(type.name) }/>
                <a href={ `#/add-content/${this.state.contentTypeName}` } title="Luo uusi" class="icon-only">
                    <FeatherSvg iconId="plus-circle" className="medium"/>
                </a>
            </InputGroup>
            { this.state.content.length ? <table class="striped">
                <thead><tr>
                    <th>#</th>
                    <th>Julkaistu</th>
                    <th></th>
                </tr></thead>
                <tbody>{ this.state.content.map(cnode => {
                    const href = `#/edit-content/${cnode.id}/${cnode.contentType}/none`;
                    return <tr>
                        <td>{ ContentNodeUtils.makeTitle(cnode) }</td>
                        <td>{ !cnode.isRevision
                            ? 'Kyllä'
                            : ['Ei ', <a href={ `${href}/publish` }>Julkaise</a>]
                        }</td>
                        <td>
                            <a href={ href } class="icon-only" title="Muokkaa">
                                <FeatherSvg iconId="edit-2" className="medium"/>
                            </a> | <a onClick={ e => this.openDeleteDialog(e, cnode) }
                                    href={ `#/delete-content/${cnode.id}` } class="icon-only" title="Poista">
                                <FeatherSvg iconId="trash-2" className="medium"/>
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
                services.console.error(err);
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
