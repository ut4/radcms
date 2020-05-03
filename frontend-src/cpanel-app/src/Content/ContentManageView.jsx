import {http, View, FeatherSvg, InputGroup, Select, hookForm} from '@rad-commons';
import {ContentFormImpl, ContentNodeUtils} from '@rad-cpanel-commons';
import openDeleteContentDialog from './ContentDeleteDialog.jsx';

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
        this.contentTypes = [];
        this.state = {
            content: null,
            message: null
        };
        let newState = {};
        http.get('/api/content-types')
            .then(ctypes => {
                this.contentTypes = ctypes;
                newState = hookForm(this, {selectedContentTypeName: getInitialContentTypeName(props, ctypes)});
                return http.get(`/api/content/${newState.values.selectedContentTypeName}`);
            })
            .then(cnodes => {
                Object.assign(newState, this.collectContent(cnodes, newState.values.selectedContentTypeName));
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
        if (this.state.content === null && !this.state.message)
            return;
        return <View><div>
            <h2>Selaa sisältöä</h2>
            <div>
                <InputGroup classes={ this.state.classes.selectedContentTypeName }>
                    <Select vm={ this } myOnChange={ newState => this.updateContent(newState) }
                            name="selectedContentTypeName">{
                        this.contentTypes.map(t =>
                            <option value={ t.name }>{ t.friendlyName }</option>
                        )
                    }</Select>
                    { this.state.values.selectedContentTypeName
                        ? <a href={ `#/add-content/${this.state.values.selectedContentTypeName}` }
                                    title="Luo uusi"
                                    class="icon-only">
                            <FeatherSvg iconId="plus-circle" className="medium"/>
                        </a>
                        : '' }
                </InputGroup>
            </div>
            { !this.state.message ? <table class="striped">
                <thead><tr>
                    <th>#</th>
                    <th>Julkaistu</th>
                    <th></th>
                </tr></thead>
                <tbody>{ this.state.content.map(cnode => {
                    const href = `#/edit-content/${cnode.id}/${cnode.contentType}/${ContentFormImpl.Default}`;
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
            </table> : <p>{ this.state.message }</p> }
        </div></View>;
    }
    /**
     * @access private
     */
    updateContent(newState) {
        const n = newState.values.selectedContentTypeName;
        if (this.cache[n]) { // {content, message}
            Object.assign(newState, this.cache[n]);
            return newState;
        }
        //
        http.get(`/api/content/${n}`)
            .then(cnodes => {
                this.setState(
                    this.collectContent(cnodes, n));
            })
            .catch(() => {
                this.setState({message: 'Jokin meni pieleen'});
            });
        return newState;
    }
    /**
     * @access private
     */
    collectContent(cnodes, selectedContentTypeName) {
        const out = {content: cnodes};
        out.message = cnodes.length ? null : 'Ei sisältöä tyypille ' +
            this.contentTypes.find(t => t.name === selectedContentTypeName).friendlyName +
            '.';
        this.cache[selectedContentTypeName] = out;
        return out;
    }
    /**
     * @access private
     */
    openDeleteDialog(e, cnode) {
        e.preventDefault();
        openDeleteContentDialog(cnode, null);
    }
}

function getInitialContentTypeName(props, ctypes) {
    if (!props.initialContentTypeName ||
        !ctypes.some(t => t.name === props.initialContentTypeName))
            return ctypes[0].name;
    return props.initialContentTypeName;
}

export default ContentManageView;
