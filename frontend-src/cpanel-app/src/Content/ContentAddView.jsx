import {http, toasters, urlUtils, View, Form, InputGroup, Input, Select} from '@rad-commons';
import {filterByUserRole} from '../ContentType/FieldList.jsx';
import getWidgetImpl from './FieldWidgets/all-with-multi.js';
const Status = Object.freeze({PUBLISHED: 0, DRAFT: 1, DELETED: 2});

/**
 * #/add-content/:initialComponentTypeName?
 */
class ContentAddView extends preact.Component {
    /**
     * @param {{initialContentTypeName: string;}} props
     */
    constructor(props) {
        super(props);
        this.newContentNode = null;
        this.contentTypes = null;
        this.state = {
            contentTypeFetched: false,
            contentType: null,
            createRevision: false,
        };
        http.get('/api/content-types/no-internals')
            .then(contentTypes => {
                this.contentTypes = contentTypes;
                const contentType = this.findContentType(props.initialContentTypeName,
                                                         contentTypes);
                this.newContentNode = this.makeNewContentNode(contentType);
                this.setState({contentTypeFetched: true, contentType});
            })
            .catch(() => {
                toasters.main('Jokin meni pieleen.', 'error');
            });
    }
    /**
     * @access protected
     */
    render() {
        if (!this.state.contentType) return null;
        return <View><Form onSubmit={ () => this.handleFormSubmit() }
                           submitButtonText="Lisää">
            <h2>Lisää sisältöä</h2>
            <InputGroup>
                <label><span data-help-text="Dev note: Voit luoda uusia sisältötyyppejä hallintapaneelin devaaja-osiosta (ks. https://todo).">Sisältötyyppi</span></label>
                <Select onChange={ e => this.receiveContentTypeSelection(e) }
                        value={ this.state.contentType.name }>
                    { this.contentTypes.map(type =>
                        <option value={ type.name }>{ type.friendlyName }</option>
                    ) }
                </Select>
            </InputGroup>
            { filterByUserRole(this.state.contentType.fields).map(f => {
                const {ImplClass, props} = getWidgetImpl(f.widget.name);
                return <ImplClass
                    field={ f }
                    initialValue={ this.newContentNode[f.name] }
                    settings={ props }
                    onValueChange={ value => {
                        this.newContentNode[f.name] = value;
                    }}/>;
            }) }
            <InputGroup label="Lisää luonnoksena" inline>
                <Input id="i-create-rev" type="checkbox"
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
            Object.assign(this.newContentNode,
                          {status: revisionSettings === '' ? Status.PUBLISHED : Status.DRAFT}))
            .then(() => {
                urlUtils.redirect('@current', 'hard');
            })
            .catch(() => {
                toasters.main('Sisällön luonti epäonnistui.', 'error');
            });
    }
    /**
     * @access private
     */
    receiveContentTypeSelection(e) {
        const newState = {contentType: this.findContentType(e.target.value,
                                                            this.contentTypes)};
        this.newContentNode = this.makeNewContentNode(newState.contentType);
        this.setState(newState);
    }
    /**
     * @access private
     */
    findContentType(ctypeName, contentTypes) {
        if (!ctypeName)
            return contentTypes[0];
        return contentTypes.find(t => t.name === ctypeName);
    }
    /**
     * @access private
     */
    makeNewContentNode(contentType) {
        return contentType.fields.reduce((out, f) =>
            Object.assign(out, {[f.name]: f.defaultValue || undefined})
        , {});
    }
}

export default ContentAddView;
export {Status};
