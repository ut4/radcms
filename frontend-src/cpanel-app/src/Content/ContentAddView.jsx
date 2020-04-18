import {http, toasters, urlUtils, View, Form, Select2, hookForm, InputGroup2, Input2} from '@rad-commons';
import {filterByUserRole} from '../ContentType/FieldList.jsx';
import getWidgetImpl from './FieldWidgets/all-with-multi.js';
import {genRandomString} from '../Website/WebsitePackView.jsx';
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
        };
        http.get('/api/content-types/no-internals')
            .then(contentTypes => {
                this.contentTypes = contentTypes.map(t =>
                    Object.assign(t, {fields: t.fields.map(f =>
                        Object.assign(f, {id: genRandomString(16)})
                    )})
                );
                const contentType = this.findContentType(props.initialContentTypeName,
                                                         contentTypes);
                this.newContentNode = this.makeNewContentNode(contentType);
                this.setState(Object.assign(
                    {contentTypeFetched: true, contentType},
                    hookForm(this,
                        {contentTypeName: contentType.name,
                         createRevision: false}
                    )
                ));
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
            <InputGroup2 classes={ this.state.classes.contentTypeName }>
                <label><span data-help-text="Dev note: Voit luoda uusia sisältötyyppejä hallintapaneelin devaaja-osiosta (ks. https://todo).">Sisältötyyppi</span></label>
                <Select2 vm={ this } myOnChange={ newState => this.receiveContentTypeSelection(newState) } name="contentTypeName">
                    { this.contentTypes.map(type =>
                        <option value={ type.name }>{ type.friendlyName }</option>
                    ) }
                </Select2>
            </InputGroup2>
            { filterByUserRole(this.state.contentType.fields).map(f => {
                const {ImplClass, props} = getWidgetImpl(f.widget.name);
                return <ImplClass
                    key={ f.id }
                    field={ f }
                    initialValue={ this.newContentNode[f.name] }
                    settings={ props }
                    onValueChange={ value => {
                        this.newContentNode[f.name] = value;
                    }}/>;
            }) }
            <InputGroup2 classes={ {} } inline>
                <label htmlFor="createRevision">Lisää luonnoksena</label>
                <Input2 vm={ this } type="checkbox" name="createRevision" id="createRevision"/>
            </InputGroup2>
        </Form></View>;
    }
    /**
     * @access private
     */
    handleFormSubmit() {
        const revisionSettings = this.state.values.createRevision ? '/with-revision' : '';
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
    receiveContentTypeSelection(newState) {
        newState.contentType = this.findContentType(newState.values.contentTypeName,
                                                    this.contentTypes);
        this.newContentNode = this.makeNewContentNode(newState.contentType);
        return newState;
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
