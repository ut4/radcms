import {http, toasters, env, urlUtils, Confirmation, FeatherSvg, hookForm, InputError} from '@rad-commons';
import ContentEditable from '../Common/ContentEditable.jsx';
import popupDialog from '../Common/PopupDialog.jsx';

class BasicInfoInputs extends preact.Component {
    /**
     * @param {{contentType: ContentType; editMode: string; blur: boolean; onEditStarted: () => any; onEditEnded: (mode: string, data: Object) => any; onEditDiscarded: (mode: string) => any;}} props
     */
    constructor(props) {
        super(props);
        this.state = this.makeState(props);
    }
    /**
     * @access protected
     */
    componentWillReceiveProps(props) {
        if (props.editMode !== 'none' && props.editMode !== this.props.editMode)
            this.setState(this.makeState(props));
    }
    /**
     * @access protected
     */
    render() {
        if (this.props.editMode === 'none') return <div class={ !this.props.blur ? '' : 'blurred' }>
            <header class="columns col-centered mb-2">
                <h3 class="column m-0">{ this.props.contentType.name }</h3>
                <div>
                    <button onClick={ () => this.props.onEditStarted() }
                            disabled={ this.props.blur }
                            title="Muokkaa sisältötyyppiä"
                            class="btn btn-icon">
                        <FeatherSvg iconId="edit" className="feather-md"/>
                    </button>
                    <button onClick={ () => this.openDeleteDialog() }
                            disabled={ this.props.blur }
                            title="Poista sisältötyyppi"
                            class="btn btn-icon">
                        <FeatherSvg iconId="x" className="feather-md"/>
                    </button>
                </div>
            </header>
            <div class="mb-8">
                <div class="my-1 text-ellipsis">Selkonimi: { this.props.contentType.friendlyName }</div>
                <div class="mb-1 text-ellipsis">Kuvaus: { this.props.contentType.description }</div>
                <div class="mb-1" data-help-text="Sisäiset sisältötyypit ei näy &quot;Luo sisältöä&quot;-, ja &quot;Kaikki sisältö&quot; -näkymissä.">Piilotettu: { !this.state.isInternal ? 'ei' : 'kyllä' }</div>
                <div class="text-ellipsis">Lomake: { this.props.contentType.frontendFormImpl }</div>
            </div>
        </div>;
        const {values, errors} = this.state;
        // edit or create
        return <div>
            <header class="columns col-centered pr-2 mb-2">
                <h3 class="column m-0 has-error">
                    <ContentEditable
                        value={ values.name }
                        onChange={ val => this.form.triggerChange(val, 'name') }/>
                    <InputError error={ errors.name }/>
                </h3>
                <div>
                    <button onClick={ () => this.endEdit() }
                            title={ `${this.props.editMode === 'edit' ? 'Tallenna' : 'Luo'} sisältötyyppi` }
                            class="btn btn-icon">
                        <FeatherSvg iconId="save"/>
                    </button>
                    <button onClick={ () => this.endEdit(true) }
                            title="Peruuta"
                            class="btn btn-link">
                        Peruuta
                    </button>
                </div>
            </header>
            <div class="container mb-8">
                <div class="columns mb-2 has-error">Selkonimi:
                    <div class="ml-2"><ContentEditable
                        value={ values.friendlyName }
                        onChange={ val => this.form.triggerChange(val, 'friendlyName') }/></div>
                    <InputError error={ errors.friendlyName } className="col-12"/>
                </div>
                <div class="columns mb-1 has-error">Kuvaus:
                    <div class="ml-2"><ContentEditable
                        value={ values.description }
                        onChange={ val => this.form.triggerChange(val, 'description') }/></div>
                    <InputError error={ errors.description } className="col-12"/>
                </div>
                <label class="columns col-centered">Piilotettu:
                    <div class="form-checkbox ml-2">
                        <input
                            type="checkbox"
                            defaultChecked={ this.state.isInternal }
                            onChange={ e => this.setState({isInternal: e.target.checked}) }/>
                        <i class="form-icon"></i>
                    </div>
                </label>
                <div class="columns mb-1 has-error">Lomake:
                    <div class="ml-2"><ContentEditable
                        value={ values.frontendFormImpl }
                        onChange={ val => this.form.triggerChange(val, 'frontendFormImpl') }/></div>
                    <InputError error={ errors.frontendFormImpl } className="col-12"/>
                </div>
            </div>
        </div>;
    }
    /**
     * @access private
     */
    makeState(props) {
        const identifierValidator = ['regexp', '^[a-zA-Z_][a-zA-Z0-9_]*$', ' ei ole kelvollinen identifier'];
        return Object.assign(
            {isInternal: props.contentType.isInternal},
            props.editMode === 'none' ? {} : hookForm(this, null, {
                name: {value: props.contentType.name,
                    validations: [['required'], ['maxLength', 64], identifierValidator],
                    label: 'Nimi'},
                friendlyName: {value: props.contentType.friendlyName,
                    validations: [['required'], ['maxLength', 128]],
                    label: 'Selkonimi'},
                description: {value: props.contentType.description,
                    validations: [['maxLength', 512]],
                    label: 'Kuvaus'},
                frontendFormImpl: {value: props.contentType.frontendFormImpl,
                    validations: [['required'], ['maxLength', 64], identifierValidator],
                    label: 'Lomake'}
            })
        );
    }
    /**
     * @param {boolean} wasCancelled
     * @access private
     */
    endEdit(wasCancelled) {
        if (wasCancelled) {
            this.props.onEditDiscarded(this.props.editMode);
            return;
        }
        if (!this.form.handleSubmit())
            return;
        this.props.onEditEnded(this.props.editMode, {
            name: this.state.values.name,
            friendlyName: this.state.values.friendlyName,
            description: this.state.values.description,
            isInternal: this.state.isInternal,
            frontendFormImpl: this.state.values.frontendFormImpl,
        });
    }
    /**
     * @access private
     */
    openDeleteDialog() {
        popupDialog.open(DeleteDialog, {
            contentType: this.props.contentType,
            onConfirm: () => {
                http.delete('/api/content-types/' + this.props.contentType.name)
                    .then(() => { urlUtils.reload(); })
                    .catch(err => {
                        env.console.error(err);
                        toasters.main('Sisältötyypin poisto epäonnistui.', 'error');
                    });
            }
        });
    }
}

class DeleteDialog extends preact.Component {
    /**
     * @param {{contentType: ContentType;}} props
     */
    constructor(props) {
        super(props);
    }
    /**
     * @access protected
     */
    render() {
        return <div class="popup-dialog"><div class="box">
            <Confirmation onConfirm={ () => this.handleConfirm() }
                confirmButtonText="Poista sisältötyyppi"
                onCancel={ () => this.handleCancel() }>
            <h2>Poista sisältötyyppi</h2>
            <div class="main">
                <p>Poista sisältötyyppi &quot;{ this.props.contentType.friendlyName }&quot; ({ this.props.contentType.name }) ja siihen liittyvä data pysyvästi?</p>
            </div>
        </Confirmation></div></div>;
    }
    /**
     * @access private
     */
    handleConfirm() {
        this.props.onConfirm();
        this.handleCancel();
    }
    /**
     * @access private
     */
    handleCancel() {
        popupDialog.close();
    }
}

export default BasicInfoInputs;
