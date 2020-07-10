import {http, toasters, hookForm, InputGroup, Input, InputError} from '@rad-commons';

class FromPackageInstallerView extends preact.Component {
    /**
     * @param {{baseUrl: string; packageExists: boolean;}} props
     */
    constructor(props) {
        super(props);
        this.state = Object.assign({},
            hookForm(this, {unlockKey: 'my-unlock-key'}),
            {installDetails: null}
        );
    }
    /**
     * @access protected
     */
    render() {
        return <div>
            <h2>Asenna RadCMS</h2>
            { this.state.installDetails
                ? <p class="info-box success">Sivusto asennettiin onnistuneesti. Siirry <a href={ this.props.makeUrl('', this.state.installDetails) }>sivustolle</a>, tai hallintanäkymän <a href={ this.props.makeUrl('login', this.state.installDetails) }>kirjautumissivulle</a>.</p>
                : null
            }
            { this.props.packageExists
                ? <form onSubmit={ e => this.handleSubmit(e) }>
                    <InputGroup classes={ this.state.classes.unlockKey }>
                        <label htmlFor="unlockKey" class="form-label">Avausavain</label>
                        <Input
                            vm={ this }
                            name="unlockKey"
                            id="unlockKey"
                            validations={ [['minLength', 12]] }
                            errorLabel="Avausavain"/>
                        <InputError error={ this.state.errors.unlockKey }/>
                    </InputGroup>
                    <input type="hidden" name="baseUrl" value={ this.props.baseUrl }/>
                    <button class="btn btn-primary mt-2" type="submit">Asenna</button>
                </form>
                : <p class="info-box error">Pakettitiedostoa &quot;tiedostonimi.radsite&quot; ei löytynyt serveriltä. Tiedosto tulisi sijaita samassa kansiossa kuin install.php.</p> }
        </div>;
    }
    /**
     * @access private
     */
    handleSubmit(e) {
        if (!this.form.handleSubmit(e))
            return;
        http.post('?q=/from-package', {unlockKey: this.state.values.unlockKey,
                                       baseUrl: this.props.baseUrl})
            .then(details => {
                this.setState({installDetails: {mainQueryVar: details.mainQueryVar}});
            })
            .catch(() => {
                toasters.main('Asennus epäonnistui', 'error');
            });
    }
}

export default FromPackageInstallerView;
