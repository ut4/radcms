import {http, toasters, urlUtils, View, Select, hookForm, InputGroup, Input, FormButtons, env} from '@rad-commons';
import {contentFormRegister} from '@rad-cpanel-commons';
import {filterByUserRoleAndNameList} from '../ContentType/FieldLists.jsx';
import getWidgetImpl from './FieldWidgets/all-with-multi.js';
import {genRandomString} from '../Website/WebsitePackView.jsx';
const Status = Object.freeze({PUBLISHED: 0, DRAFT: 1, DELETED: 2});
import webPageState from '../webPageState.js';

/**
 * #/add-content/:initialComponentTypeName?/:panelIdx?[?return-to=path]
 */
class ContentAddView extends preact.Component {
    /**
     * @param {{initialContentTypeName: string; panelIdx?: string;}} props
     */
    constructor(props) {
        super(props);
        this.newContentNode = null;
        this.contentTypes = null;
        this.state = {
            newContentNodeKey: null,
            contentType: null,
            FormImpl: null,
            formImplProps: null,
        };
        this.contentForm = preact.createRef();
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
                    {contentType},
                    hookForm(this,
                        {contentTypeName: contentType.name,
                         createAsDraft: false}
                    ),
                    !this.state.FormImpl
                        ? ContentAddView.makeFormCfg(props.panelIdx, contentType)
                        : null
                ));
            })
            .catch(err => {
                env.console.error(err);
                toasters.main('Jokin meni pieleen.', 'error');
            });
    }
    /**
     * @param {string?} panelIdx
     * @param {ContentType=} contentType = null
     * @access public
     */
    static makeFormCfg(panelIdx, contentType = null) {
        const panelConfig = panelIdx
            ? webPageState.currentContentPanels[panelIdx || -1] || {}
            : {formImpl: contentType.frontendFormImpl};
        return {
            FormImpl: contentFormRegister.getImpl(panelConfig.formImpl || 'Default'),
            formImplProps: panelConfig.formImplProps || {},
            newContentNodeKey: panelIdx || -1,
        };
    }
    /**
     * @access protected
     */
    componentWillReceiveProps(props) {
        if (props.panelIdx !== this.props.panelIdx)
            this.setState(ContentAddView.makeFormCfg(props.panelIdx));
    }
    /**
     * @access protected
     */
    render() {
        if (!this.state.contentType) return null;
        const {FormImpl, formImplProps} = this.state;
        return <View><form onSubmit={ e => this.handleFormSubmit(e) } class={ this.state.formClasses }>
            <h2>Lisää sisältöä</h2>
            <InputGroup classes={ this.state.classes.contentTypeName }>
                <label class="form-label"><span data-help-text="Dev note: Voit luoda uusia sisältötyyppejä hallintapaneelin devaaja-osiosta (ks. https://todo).">Sisältötyyppi</span></label>
                <Select vm={ this } myOnChange={ newState => this.receiveContentTypeSelection(newState) } name="contentTypeName">
                    { this.contentTypes.map(type =>
                        <option value={ type.name }>{ type.friendlyName }</option>
                    ) }
                </Select>
            </InputGroup>
            { FormImpl
                ? <FormImpl
                    fields={ filterByUserRoleAndNameList(this.state.contentType.fields,
                        this.state.formImplProps.fieldsToDisplay) }
                    values={ this.newContentNode }
                    settings={ formImplProps }
                    getWidgetImpl={ getWidgetImpl }
                    setFormClasses={ str => {
                        this.setState({formClasses: str.toString()});
                    } }
                    contentType={ this.state.contentType }
                    fieldHints={ [] }
                    ref={ this.contentForm }
                    key={ this.state.newContentNodeKey }/>
                : null }
            <InputGroup>
                <label class="form-checkbox">
                    <Input vm={ this } type="checkbox" name="createAsDraft" id="createAsDraft"/>
                    <i class="form-icon"></i> Lisää luonnoksena
                </label>
            </InputGroup>
            <FormButtons buttons={ ['submitWithAlt', 'cancel'] }
                submitButtonText="Lisää"
                altSubmitButtonText="Lisää ja palaa"/>
        </form></View>;
    }
    /**
     * @access private
     */
    handleFormSubmit(e) {
        const values = this.contentForm.current.submit(e);
        if (!values)
            return;
        const publishSettings = !this.state.values.createAsDraft ? '' : '/as-draft';
        return http.post(`/api/content/${this.state.contentType.name}${publishSettings}`,
            Object.assign(this.newContentNode,
                          values,
                          {status: publishSettings === '' ? Status.PUBLISHED : Status.DRAFT}))
            .then(() => {
                if (e.altSubmitLinkIndex === 0) urlUtils.reload();
                else if (this.props.matches['return-to'] !== undefined) urlUtils.redirect(this.props.matches['return-to']);
                else urlUtils.redirect('@current', 'hard');
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
            Object.assign(out, {[f.name]: f.defaultValue ||
                getWidgetImpl(f.widget.name).ImplClass.getInitialValue(f.widget.args)})
        , {});
    }
}

export default ContentAddView;
export {Status};
