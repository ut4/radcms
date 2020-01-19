import {http, urlUtils, View, InputGroup, Form} from '@rad-commons';
import {widgetTypes} from '../Widgets/all.jsx';
import ContentNodeFieldList from './ContentNodeFieldList.jsx';

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
        http.get('/api/content-types/no-internals')
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
        return <View><Form onConfirm={ e => this.handleFormSubmit(e) }
                           confirmButtonText="Lisää"
                           autoClose={ false }>
            <h2>Lisää sisältöä</h2>
            <InputGroup label={ () => <span data-help-text="Dev note: Voit luoda uusia sisältötyyppejä muokkaamalla site.json-tiedostoa (ks. https://todo).">Sisältötyyppi</span> }>
                <select onChange={ e => this.receiveContentTypeSelection(e) }
                        value={ this.state.contentType.name }>
                    { this.state.contentTypes.map(type =>
                        <option value={ type.name }>{ type.friendlyName }</option>
                    ) }
                </select>
            </InputGroup>
            <ContentNodeFieldList contentNode={ this.state.newContentNode }
                                  contentType={ this.state.contentType }
                                  ref={ cmp => { if (cmp) this.fieldListCmp = cmp; } }
                                  key={ this.state.contentType.name }/>
            <InputGroup label="Lisää luonnoksena" inline={ true }>
                <input id="i-create-rev" type="checkbox"
                       onChange={ e => this.setState({createRevision: e.target.checked}) }/>
            </InputGroup>
        </Form></View>;
    }
    /**
     * @access private
     */
    handleFormSubmit() {
        const revisionSettings = this.state.createRevision ? '/with-revision' : '';
        return http.post(`/api/content/${this.state.contentType.name}${revisionSettings}`,
            Object.assign({isPublished: revisionSettings === ''},
                          this.fieldListCmp.getResult()))
            .then(() => {
                urlUtils.redirect(this.props.returnTo || '/', true);
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
            const widgetInfo = field.widget
                ? widgetTypes.find(w => w.name === field.widget.name)
                : null;
            newState.newContentNode[field.name] = widgetInfo
                ? widgetInfo.defaultInitialValue
                : '';
        });
    }
}

export default ContentAddView;
