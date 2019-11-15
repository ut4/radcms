import services from '../../../src/common-services.js';
import {View, Form} from '../../../src/common-components.js';
import ContentNodeFieldList from './ContentNodeFieldList.js';

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
        return $el(View, null, $el(Form, {onConfirm: e => this.handleFormSubmit(e)},
            $el('h2', null, 'Lisää sisältöä'),
            $el('label', null,
                $el('span', {'data-help-text': 'Dev note: Voit luoda uusia sisältötyyppejä muokkaamalla site.ini-tiedostoa.'}, 'Sisältötyyppi'),
                $el('select', {onChange: e => this.receiveContentTypeSelection(e),
                               value: this.state.ctype.name},
                    this.state.contentTypes.map(type =>
                        $el('option', {value: type.name}, type.friendlyName)
                    ))
            ),
            $el(ContentNodeFieldList, {cnode: this.state.newCnode,
                                       ctype: this.state.ctype,
                                       ref: cmp => { if (cmp) this.fieldListCmp = cmp; },
                                       key: this.state.ctype.name})
        ));
    }
    /**
     * @access private
     */
    handleFormSubmit() {
        return services.myFetch(`/api/content/${this.state.ctype.name}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            data: JSON.stringify(this.fieldListCmp.getResult())
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
