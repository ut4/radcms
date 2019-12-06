import {services, components} from '../../../rad-commons.js';
import ContentNodeFieldList from './ContentNodeFieldList.js';
const {View, Form} = components;

/**
 * #/add-content[/:initialComponentTypeName?returnto=<url>]
 */
class ContentAddView extends preact.Component {
    /**
     * @param {{initialContentTypeName: string; returnTo?: string;}} props
     */
    constructor(props) {
        super(props);
        this.state = {
            contentTypes: null,
            newCnode: null,
            ctype: null,
            createRevision: false,
        };
        services.myFetch('/api/content-types').then(
            res => {
                const newState = {contentTypes: JSON.parse(res.responseText)};
                const ctypeName = props.initialContentTypeName || newState.contentTypes[0].name;
                this.setContentTypeAndCreateEmptyContentNode(ctypeName, newState);
                this.setState(newState);
            },
            () => { toast('Jokin meni pieleen.', 'error'); }
        );
    }
    /**
     * @access protected
     */
    render() {
        if (!this.state.contentTypes) return null;
        if (!this.state.ctype) return $el(`Sisältötyyppiä ${this.props.initialContentType} ei löytynyt.`);
        return $el(View, null, $el(Form, {onConfirm: e => this.handleFormSubmit(e),
                                          confirmButtonText: 'Lisää'},
            $el('h2', null, 'Lisää sisältöä'),
            $el('label', null,
                $el('span', {'data-help-text': 'Dev note: Voit luoda uusia sisältötyyppejä muokkaamalla site.json-tiedostoa (ks. https://todo).'}, 'Sisältötyyppi'),
                $el('select', {onChange: e => this.receiveContentTypeSelection(e),
                               value: this.state.ctype.name},
                    this.state.contentTypes.map(type =>
                        $el('option', {value: type.name}, type.friendlyName)
                    ))
            ),
            $el(ContentNodeFieldList, {cnode: this.state.newCnode,
                                       ctype: this.state.ctype,
                                       ref: cmp => { if (cmp) this.fieldListCmp = cmp; },
                                       key: this.state.ctype.name}),
            $el('div', null,
                $el('input', {id: 'i-create-rev', type: 'checkbox',
                              onChange: e => this.setState({createRevision: e.target.checked})}),
                $el('label', {for: 'i-create-rev', className: 'inline'}, 'Lisää luonnoksena')
            )
        ));
    }
    /**
     * @access private
     */
    handleFormSubmit() {
        const revisionSettings = this.state.createRevision ? '/with-revision' : '';
        return services.myFetch(`/api/content/${this.state.ctype.name}${revisionSettings}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            data: JSON.stringify(Object.assign({isPublished: revisionSettings === ''},
                                               this.fieldListCmp.getResult()))
        }).then(() => {
            services.redirect(this.props.returnTo || '/', true);
        }, () => {
            toast('Sisällön luonti epäonnistui.', 'error');
        });
    }
    /**
     * @access private
     */
    receiveContentTypeSelection(e) {
        this.setContentTypeAndCreateEmptyContentNode(e.target.value, this.state);
        this.setState({ctype: this.state.ctype, newCnode: this.state.newCnode});
    }
    /**
     * @access private
     */
    setContentTypeAndCreateEmptyContentNode(ctypeName, newState) {
        newState.ctype = newState.contentTypes.find(t => t.name == ctypeName);
        newState.newCnode = {};
        newState.ctype.fields.forEach(field => {
            newState.newCnode[field.name] = '';
        });
    }
}

export default ContentAddView;
