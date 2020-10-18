import {http, config, toasters, urlUtils, View, FeatherSvg, InputGroup, FormButtons, env, dateUtils} from '@rad-commons';
import LoadingSpinner from '../Common/LoadingSpinner.jsx';
import Tabs from '../Common/Tabs.jsx';
import openDeleteContentDialog from './ContentDeleteDialog.jsx';
import getWidgetImpl from './FieldWidgets/all-with-multi.js';
import {filterByUserRoleAndNameList} from '../ContentType/FieldLists.jsx';
import ContentAddView, {Status} from './ContentAddView.jsx';

/**
 * #/edit-content/:id/:contentTypeName/:panelIdx?/:publish?[?return-to=path]
 */
class ContentEditView extends preact.Component {
    /**
     * @param {{id: string; contentTypeName: string; panelIdx?: string; publish?: string;}} props
     */
    constructor(props) {
        super(props);
        this.contentNode = null;
        this.contentType = null;
        this.state = {
            doPublish: false,
            formClasses: null,
            FormImpl: null,
            formImplProps: null,
            currentTabIdx: 0,
        };
        this.contentForm = preact.createRef();
        this.fetchContentAndUpdateState(props);
    }
    /**
     * @param {Object} data
     * @param {string=} publishSettings = ''
     * @param {Object=} e = null
     * @returns {Promise<void>}
     * @access public
     */
    updateContent(data, publishSettings = '', e = null) {
        return http.put(`/api/content/${this.props.id}/${this.props.contentTypeName}${publishSettings||''}`, data)
            .then(() => {
                if (e && e.altSubmitLinkIndex === 0) urlUtils.reload();
                else if (this.props.matches['return-to'] !== undefined) urlUtils.redirect(this.props.matches['return-to']);
                else urlUtils.redirect('@current', 'hard');
            })
            .catch(() => {
                toasters.main('Sisällön tallennus epäonnistui.', 'error');
            });
    }
    /**
     * @access protected
     */
    componentWillReceiveProps(props) {
        if (props.id !== this.props.id)
            this.fetchContentAndUpdateState(props);
        else if (props.panelIdx !== this.props.panelIdx)
            this.setState(ContentAddView.makeFormCfg(props.panelIdx,
                                                     this.contentType));
        else if (props.publish !== this.props.publish)
            this.setState({doPublish: !!props.publish});
    }
    /**
     * @access protected
     */
    render(_, {FormImpl, currentTabIdx}) {
        if (!FormImpl) return null;
        return <View><form onSubmit={ e => this.handleFormSubmit(e) } class={ this.state.formClasses }>
            <h2 class="columns col-auto">{ [this.title].concat(this.contentNode ? [
                this.contentNode.isDraft && !this.props.publish
                    ? <sup class="color-alt"> (Luonnos)</sup>
                    : null,
                config.userPermissions.canDeleteContent
                    ? <button onClick={ () => openDeleteContentDialog(this.contentNode) }
                            class="btn btn-icon ml-1" title="Poista" type="button">
                        <FeatherSvg iconId="trash-2" className="medium"/>
                    </button>
                    : null
            ] : []) }</h2>
            <Tabs links={ ['Sisältö', 'Historia'] } onTabChanged={ idx => this.setState({currentTabIdx: idx}) }/>
            <div class={ currentTabIdx === 0 ? 'mt-2' : 'hidden' }>
            { this.contentNode ? [
                <FormImpl
                    fields={ filterByUserRoleAndNameList(this.contentType.fields,
                        this.state.formImplProps.fieldsToDisplay) }
                    values={ this.contentNode }
                    settings={ this.state.formImplProps }
                    getWidgetImpl={ getWidgetImpl }
                    key={ this.contentNode.id }
                    setFormClasses={ str => {
                        this.setState({formClasses: str.toString()});
                    } }
                    contentType={ this.contentType }
                    fieldHints={ [] }
                    ref={ this.contentForm }/>,
            this.contentNode.isDraft && !this.props.publish
                ? <InputGroup className="mt-2">
                    <label class="form-checkbox">
                        <input id="doPublish" type="checkbox" defaultChecked={ this.state.doPublish }
                            onChange={ e => this.setState({doPublish: e.target.checked}) }/>
                        <i class="form-icon"></i> Julkaise
                    </label>
                </InputGroup>
                : null,
            <FormButtons
                submitButtonText={ this.submitButtonText }
                altSubmitButtonText="Tallenna ja palaa"
                buttons={ [
                    'submitWithAlt',
                    !this.contentNode.isDraft
                        ? <button onClick={ e => this.switchToDraft(e) } class="btn ml-2" type="button">
                            Vaihda luonnokseen
                        </button>
                        : null,
                    'cancel'
                ] }/> ] : <p>Sisältöä ei löytynyt.</p> }
            </div>
            <RevisionsTab currentTabIdx={ currentTabIdx } parent={ this }/>
        </form></View>;
    }
    /**
     * @access private
     */
    fetchContentAndUpdateState(props) {
        const newState = {doPublish: !!props.publish};
        this.title = 'Muokkaa sisältöä';
        this.submitButtonText = 'Tallenna';
        if (newState.doPublish) {
            this.title = 'Julkaise sisältöä';
            this.submitButtonText = 'Julkaise';
        }
        http.get(`/api/content/${props.id}/${props.contentTypeName}`)
            .then(cnode => {
                this.contentNode = cnode;
                return http.get(`/api/content-types/${props.contentTypeName}`);
            })
            .then(ctype => {
                this.contentType = ctype;
            })
            .catch(() => {
                toasters.main('Jokin meni pieleen', 'error');
            })
            .finally(() => {
                this.setState(Object.assign(newState,
                    ContentAddView.makeFormCfg(props.panelIdx,
                                               this.contentType)));
            });
    }
    /**
     * @access private
     */
    handleFormSubmit(e, publishSettings = null) {
        const values = this.contentForm.current.submit(e);
        if (!values)
            return;
        let status = this.contentNode.status;
        if (!publishSettings)
            publishSettings = !this.state.doPublish ? '' : '/publish';
        if (publishSettings === '/publish')
            status = Status.PUBLISHED;
        else if (publishSettings === '/unpublish')
            status = Status.DRAFT;
        return this.updateContent(Object.assign(this.contentNode, values, {status}),
                                  publishSettings,
                                  e);
    }
    /**
     * @access private
     */
    switchToDraft(e) {
        this.handleFormSubmit(e, '/unpublish');
    }
}

class RevisionsTab extends preact.Component {
    /**
     * @param {{currentTabIdx: number; parent: ContentEditView;}}
     */
    constructor(props) {
        super(props);
        this.state = {revisions: null};
    }
    /**
     * @access protected
     */
    componentWillReceiveProps(props) {
        if (props.currentTabIdx === 1 && !this.state.revisions)
            this.fetchRevisions();
    }
    /**
     * @access protected
     */
    render({currentTabIdx}) {
        if (currentTabIdx !== 1)
            return null;
        return <div class="mt-10">
            { this.state.revisions
                ? this.state.revisions.length ? <div>{ this.state.revisions.map((rev, i) =>
                    <div class={ i > 0 ? 'mt-10' : ''}>
                        <div>{ dateUtils.getLocaleDateString(new Date(rev.createdAt*1000), true) }</div>
                        <pre class="code"><code>{ JSON.stringify(JSON.parse(rev.snapshot), null, 2) }</code></pre>
                        <button
                            onClick={ () => this.applyRevision(rev) }
                            class="btn btn-sm"
                            disabled={ i === 0 }
                            type="button">Palaa tähän versioon</button>
                    </div>
                ) }</div> : <p class="mb-0">Versioita ei löytynyt.</p>
                : <LoadingSpinner/> }
        </div>;
    }
    /**
     * @access private
     */
    fetchRevisions() {
        http.get('/api/content/' + this.props.parent.props.id + '/' +
                 this.props.parent.props.contentTypeName + '/revisions')
            .then(revisions => { this.setState({revisions}); })
            .catch(env.console.error);
    }
    /**
     * @access private
     */
    applyRevision(revision) {
        this.props.parent.updateContent(Object.assign(
            JSON.parse(revision.snapshot),
            {isDraft: this.props.parent.contentNode.isDraft}));
    }
}

export default ContentEditView;
