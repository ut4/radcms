import {services, components} from '../../../rad-commons.js';
import ContentNodeFieldList from './ContentNodeFieldList.js';
const {View, InputGroup, Form} = components;

const DefaultInitialValsByWidgetType = {
    color: '#33393e'
};

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
            newContentNode: null,
            contentType: null,
            createRevision: false,
        };
        services.http.get('/api/content-types/no-internals')
            .then(contentTypes => {
                const newState = {contentTypes};
                const ctypeName = props.initialContentTypeName || newState.contentTypes[0].name;
                this.setContentTypeAndCreateEmptyContentNode(ctypeName, newState);
                this.setState(newState);
            })
            .catch(() => {
                toast('Jokin meni pieleen.', 'error');
            });
    }
    /**
     * @access protected
     */
    render() {
        if (!this.state.contentTypes) return null;
        return $el(View, null, $el(Form, {onConfirm: e => this.handleFormSubmit(e),
                                          confirmButtonText: 'Lisää',
                                          autoClose: false},
            $el('h2', null, 'Lisää sisältöä'),
            $el(InputGroup, {label: _props => $el('span', {'data-help-text': 'Dev note: Voit luoda uusia sisältötyyppejä muokkaamalla site.json-tiedostoa (ks. https://todo).'}, 'Sisältötyyppi')},
                $el('select', {onChange: e => this.receiveContentTypeSelection(e),
                               value: this.state.contentType.name},
                    this.state.contentTypes.map(type =>
                        $el('option', {value: type.name}, type.friendlyName)
                    ))
            ),
            $el(ContentNodeFieldList, {contentNode: this.state.newContentNode,
                                       contentType: this.state.contentType,
                                       ref: cmp => { if (cmp) this.fieldListCmp = cmp; },
                                       key: this.state.contentType.name}),
            $el(InputGroup, {label: 'Lisää luonnoksena', inline: true},
                $el('input', {id: 'i-create-rev', type: 'checkbox',
                              onChange: e => this.setState({createRevision: e.target.checked})})
            )
        ));
    }
    /**
     * @access private
     */
    handleFormSubmit() {
        const revisionSettings = this.state.createRevision ? '/with-revision' : '';
        return services.http.post(`/api/content/${this.state.contentType.name}${revisionSettings}`,
            Object.assign({isPublished: revisionSettings === ''},
                          this.fieldListCmp.getResult()))
            .then(() => {
                services.redirect(this.props.returnTo || '/', true);
            })
            .catch(() => {
                toast('Sisällön luonti epäonnistui.', 'error');
            });
    }
    /**
     * @access private
     */
    receiveContentTypeSelection(e) {
        this.setContentTypeAndCreateEmptyContentNode(e.target.value, this.state);
        this.setState({contentType: this.state.contentType, newContentNode: this.state.newContentNode});
    }
    /**
     * @access private
     */
    setContentTypeAndCreateEmptyContentNode(ctypeName, newState) {
        newState.contentType = newState.contentTypes.find(t => t.name === ctypeName);
        newState.newContentNode = {};
        newState.contentType.fields.forEach(field => {
            const val = field.widget ? DefaultInitialValsByWidgetType[field.widget.name] : '';
            newState.newContentNode[field.name] = val !== undefined ? val : '';
        });
    }
}

export default ContentAddView;
