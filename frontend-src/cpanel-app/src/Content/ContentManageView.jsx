import {http, env, toasters, View, FeatherSvg, urlUtils} from '@rad-commons';
import {ContentNodeUtils} from '@rad-cpanel-commons';
import openDeleteContentDialog from './ContentDeleteDialog.jsx';
import ContentTypeDropdown from '../ContentType/ContentTypeDropdown.jsx';
import LoadingSpinner from '../Common/LoadingSpinner.jsx';
import {timingUtils} from '../Common/utils.js';
import webPageState from '../webPageState.js';

/**
 * #/manage-content/:initialContentTypeName?/:panelIdx?: näkymä jolla admin voi
 * selata kaikkea cms:ään tallennettua sisältöä, ja käyttäjä yksittäisen fetchAll-
 * kokoelman sisältöä.
 */
class ContentManageView extends preact.Component {
    /**
     * @param {{initialContentTypeName?: string;}} props
     */
    constructor(props) {
        super(props);
        this.state = {isFetching: true, isChangingContentType: false,
                      contentTypeName: null, content: null, searchTerm: ''};
        this.contentTypes = null;
        this.searchFieldName = null;
        let contentTypeName = null;
        http.get('/api/content-types')
            .then(contentTypes => {
                this.contentTypes = contentTypes;
                contentTypeName = props.initialContentTypeName || contentTypes[0].name;
                const fieldName = this.getSearchFieldName(contentTypeName);
                if (fieldName) this.searchFieldName = fieldName;
                else throw new Error(`${contentTypeName} not found.`);
                return this.fetchInitialContent(props, contentTypeName);
            })
            .catch(err => {
                env.console.error(err);
                toasters.main('Jokin meni pieleen', 'error');
            });
        this.debouncedSearchTermTypedHandler = timingUtils.debounce(
            this.handleSearchTermTyped.bind(this), 200);
    }
    /**
     * @access protected
     */
    componentWillReceiveProps(props) {
        if (props.panelIdx !== this.props.panelIdx) {
            this.setState({isFetching: true, contentTypeName: props.initialContentTypeName});
            this.fetchInitialContent(props, props.initialContentTypeName);
        }
    }
    /**
     * @access protected
     */
    render(_, {content, isFetching, isChangingContentType, contentTypeName}) {
        if (!content) return <View>
            <h2>Selaa sisältöä</h2>
            <LoadingSpinner/>
        </View>;
        return <View>
            <h2>Selaa sisältöä</h2>
            <div class="col-centered columns container">
                <ContentTypeDropdown
                    initialValue={ contentTypeName }
                    contentTypes={ this.contentTypes }
                    onSelected={ type => {
                        this.searchFieldName = this.getSearchFieldName(type.name);
                        this.reFetchContent(type.name);
                    } }/>
                <a href={ `#/add-content/${contentTypeName}?return-to=/manage-content/${contentTypeName}` } title="Luo uusi" class="px-2">
                    <FeatherSvg iconId="plus-circle" className="medium"/>
                </a>
                { isFetching ? <LoadingSpinner/> : null }
            </div>
            <div class="mt-10">
                <div class="pseudo-form-input has-icon-right mb-10">
                    <input class="form-input" placeholder="Suodata" disabled={ isChangingContentType }
                        onInput={ this.debouncedSearchTermTypedHandler }/>
                    <i class="rad-form-icon"><FeatherSvg iconId="search" className="feather-md"/></i>
                </div>
            </div>
            { content.length ? <table class="table">
                <thead><tr>
                    <th>#</th>
                    <th>Julkaistu</th>
                    <th class="buttons"></th>
                </tr></thead>
                <tbody>{ content.map(cnode => {
                    const basePath = `#/edit-content/${cnode.id}/${cnode.contentType}/none`;
                    const qs = `?return-to=/manage-content/${contentTypeName}`;
                    return <tr>
                        <td>{ ContentNodeUtils.makeTitle(cnode) }</td>
                        <td>{ !cnode.isDraft
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
            </table> : <p>Ei sisältöä { (!this.state.searchTerm
                ? `sisältötyypille ${this.contentTypes.find(t => t.name === contentTypeName).friendlyName}`
                : `hakusanalla "${this.state.searchTerm}"`) }</p> }
        </View>;
    }
    /**
     * @access private
     */
    getSearchFieldName(contentTypeName) {
        const contentType = this.contentTypes.find(t => t.name === contentTypeName);
        if (!contentType) return null;
        const nameField = contentType.fields.find(f =>
            ['name', 'title'].indexOf(f.name) > -1
        );
        return nameField ? nameField.name : 'id';
    }
    /**
     * @access private
     */
    fetchContent(contentTypeName, filters = null) {
        const filtersUrl = !filters ? '' : `/${JSON.stringify(filters)}`;
        return http.get(`/api/content/${contentTypeName}${filtersUrl}`)
            .catch(err => {
                env.console.error(err);
                toasters.main('Jokin meni pieleen', 'error');
                return null;
            });
    }
    /**
     * @access private
     */
    fetchInitialContent(props, contentTypeName) {
        const p = webPageState.currentContentPanels[props.panelIdx || -1];
        const filters = !p || !p.contentNodes.length ? null : {id: {$in: p.contentNodes.map(n => n.id)}};
        return this.fetchContent(contentTypeName, filters)
            .then(content => {
                if (!props.initialContentTypeName)
                    urlUtils.replace(`#/manage-content/${contentTypeName}`);
                this.setState({content, isFetching: false, contentTypeName});
            });
    }
    /**
     * @access private
     */
    reFetchContent(contentTypeName, filters = null) {
        const searchTerm = !filters ? null : filters[this.searchFieldName].$contains;
        const newState = {isFetching: true, isChangingContentType: filters === null};
        this.setState(newState);
        this.fetchContent(contentTypeName, !searchTerm ? null : filters).then(content => {
            this.setState({content, isFetching: false, isChangingContentType: false,
                           searchTerm, contentTypeName});
            if (newState.isChangingContentType)
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
    /**
     * @access private
     */
    handleSearchTermTyped(e) {
        const term = e.target.value;
        this.reFetchContent(this.state.contentTypeName,
                            {[this.searchFieldName]: {$contains: term}});
    }
}

export default ContentManageView;
