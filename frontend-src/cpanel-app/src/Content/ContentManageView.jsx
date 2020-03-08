import {http, View, FeatherSvg, InputGroup} from '@rad-commons';
import {ContentNodeUtils} from '@rad-cpanel-commons';

/**
 * #/manage-content/:initialContentTypeName.
 */
class ContentManageView extends preact.Component {
    /**
     * @param {Object} props
     */
    constructor(props) {
        super(props);
        this.cache = {};
        this.state = {
            content: [],
            contentTypes: [],
            selectedContentTypeName: null,
            message: null
        };
        const newState = {};
        http.get('/api/content-types')
            .then(ctypes => {
                newState.contentTypes = ctypes;
                newState.selectedContentTypeName = !props.initialContentTypeName ||
                    !ctypes.some(t => t.name === props.initialContentTypeName)
                        ? ctypes[0].name
                        : props.initialContentTypeName;
                return http.get(`/api/content/${newState.selectedContentTypeName}`);
            })
            .then(cnodes => {
                this.setContent(cnodes, newState);
            })
            .catch(() => {
                newState.message = 'Jokin meni pieleen';
            })
            .finally(() => {
                this.setState(newState);
            });
    }
    /**
     * @access protected
     */
    render() {
        return <View><div>
            <h2>Sisältö</h2>
            <div>
                <InputGroup inline={ true }
                            label={ this.state.selectedContentTypeName
                                ? () => <a href={ `#/add-content/${this.state.selectedContentTypeName}` }
                                           title="Luo uusi"
                                           class="icon-only">
                                    <FeatherSvg iconId="plus-circle" className="medium"/>
                                </a>
                                : '' }>
                    <select onChange={ e => this.updateContent(e) }
                            value={ this.state.selectedContentTypeName }>{
                        this.state.contentTypes.map(t =>
                            <option value={ t.name }>{ t.friendlyName }</option>
                        )
                    }</select>
                </InputGroup>
            </div>
            { !this.state.message ? <table class="striped">
                <thead><tr>
                    <th>Nimi</th>
                    <th>Julkaistu</th>
                    <th></th>
                </tr></thead>
                <tbody>{ this.state.content.map(cnode => {
                    const href = `/edit-content/${cnode.id}/${cnode.contentType}`;
                    return <tr>
                        <td>{ ContentNodeUtils.makeTitle(cnode) }</td>
                        <td>{ !cnode.isRevision
                            ? 'Kyllä'
                            : ['Ei ', <a href={ `#${href}/publish` }>Julkaise</a>]
                        }</td>
                        <td>
                            <a href={ href } class="icon-only">
                                <FeatherSvg iconId="edit-2" className="medium"/>
                            </a>
                        </td>
                    </tr>;
                }) }</tbody>
            </table> : <p>{ this.state.message }</p> }
        </div></View>;
    }
    /**
     * @access private
     */
    updateContent(e) {
        const newState = {content: [], selectedContentTypeName: e.target.value};
        if (this.state.selectedContentTypeName === newState.selectedContentTypeName) return;
        newState.content = this.cache[newState.selectedContentTypeName];
        if (newState.content) { this.setState(newState); return; }
        //
        http.get(`/api/content/${newState.selectedContentTypeName}`)
            .then(cnodes => {
                this.setContent(cnodes, newState);
                this.setState(newState);
            })
            .catch(() => {
                this.setState({message: 'Jokin meni pieleen'});
            });
    }
    /**
     * @access private
     */
    setContent(cnodes, newState) {
        newState.content = cnodes;
        this.cache[newState.selectedContentTypeName] = cnodes;
        newState.message = cnodes.length ? null : 'Ei sisältöä tyypille ' +
            newState.contentTypes[0].friendlyName + '.';
    }
}

export default ContentManageView;
