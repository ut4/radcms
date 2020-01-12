import {services, components} from '../../../rad-commons.js';
import CNodeUtils from './Utils.js';
const {View, FeatherSvg, InputGroup} = components;

/**
 * #/manage-content.
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
        services.http.get('/api/content-types')
            .then(ctypes => {
                newState.contentTypes = ctypes;
                newState.selectedContentTypeName = ctypes[0].name;
                return services.http.get(`/api/content/${ctypes[0].name}`);
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
        return $el(View, null, $el('div', null,
            $el('h2', null, 'Sisältö'),
            $el('div', null,
                $el(InputGroup, {inline: true,
                                 label: this.state.selectedContentTypeName
                                    ? () => $el('a', {href: '#/add-content/' + this.state.selectedContentTypeName,
                                                      className: 'icon-only'},
                                                $el(FeatherSvg, {iconId: 'plus-circle', className: 'small'})
                                            )
                                    : ''},
                    $el('select', {onChange: e => { this.updateContent(e); }},
                        this.state.contentTypes.map(t =>
                            $el('option', {value: t.name}, t.friendlyName)
                        ))
                ),
            ),
            !this.state.message ? $el('table', {className: 'striped'},
                $el('thead', null, $el('tr', null,
                    $el('th', null, 'Nimi'),
                    $el('th', null, 'Julkaistu'),
                    $el('th', null, '')
                )),
                $el('tbody', null, this.state.content.map(cnode => {
                    const href = `/edit-content/${cnode.id}/${cnode.contentType}`;
                    return $el('tr', null,
                        $el('td', null, CNodeUtils.makeTitle(cnode)),
                        $el('td', null, !cnode.isRevision
                            ? 'Kyllä'
                            : ['Ei ', $el('a', {href: `#${href}/publish`}, 'Julkaise')]),
                        $el('td', null,
                            $el('a', {href, className: 'icon-only'},
                                $el(FeatherSvg, {iconId: 'edit-2', className: 'small'})
                            )
                        )
                    );
                }))
            ) : $el('p', null, this.state.message)
        ));
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
        services.http.get(`/api/content/${newState.selectedContentTypeName}`)
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
