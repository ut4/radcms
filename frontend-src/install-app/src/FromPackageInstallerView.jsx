import {hookForm, InputGroup2, Input2, InputError2} from '@rad-commons';

class FromPackageInstallerView extends preact.Component {
    /**
     * @param {{siteDirPath: string; baseUrl: string;}} props
     */
    constructor(props) {
        super(props);
        this.state = hookForm(this, {
            packageFile: '',
            unlockKey: 'my-unlock-key',
        });
    }
    /**
     * @access protected
     */
    render() {
        return <div>
            <h2>Asenna RadCMS</h2>
            <form onSubmit={ e => this.handleSubmit(e) } action="?q=/from-package" method="post" encType="multipart/form-data">
                <InputGroup2 classes={ this.state.classes.packageFile }>
                    <label htmlFor="packageFile">Pakettitiedosto</label>
                    <Input2
                        vm={ this }
                        name="packageFile"
                        id="packageFile"
                        type="file"
                        accept=".radsite"
                        validations={ [['required']] }
                        errorLabel="Pakettitiedosto"/>
                    <InputError2 error={ this.state.errors.packageFile }/>
                </InputGroup2>
                <InputGroup2 classes={ this.state.classes.unlockKey }>
                    <label htmlFor="unlockKey">Avausavain</label>
                    <Input2
                        vm={ this }
                        name="unlockKey"
                        id="unlockKey"
                        validations={ [['minLength', 12]] }
                        errorLabel="Avausavain"/>
                    <InputError2 error={ this.state.errors.unlockKey }/>
                </InputGroup2>
                <input type="hidden" name="baseUrl" value={ this.props.baseUrl }/>
                <button class="nice-button primary" type="submit">Asenna</button>
            </form>
        </div>;
    }
    /**
     * @access private
     */
    handleSubmit(e) {
        if (!this.form.handleSubmit(e))
            return;
        e.target.submit();
    }
}

export default FromPackageInstallerView;
