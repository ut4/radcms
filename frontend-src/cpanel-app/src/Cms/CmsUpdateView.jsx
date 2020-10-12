import {View, hookForm, InputGroup, Input, InputError, FormButtons, http, env, urlUtils} from '@rad-commons';
import LoadingSpinner from '../Common/LoadingSpinner.jsx';

/**
 * #/self-update: näkymä, jolla moderaattorikäyttäjä voi päivittää cms:n serve-
 * rille ladatulla allekirjoitetulla paketilla.
 */
class CmsUpdateView extends preact.Component {
    /**
     * @param {Object} props
     */
    constructor(props) {
        super(props);
        this.state = {packageFileName: undefined};
        http.get('/api/updates')
            .then(files => {
                this.setState(Object.assign(
                    {packageFileName: files[0] || null, errorReportedByBacked: null},
                    hookForm(this, {unlockKey: 'my-unlock-key'})
                ));
            })
            .catch(env.console.error);
    }
    /**
     * @access protected
     */
    render(_, {packageFileName}) {
        return <View>
            <h2>Päivitä RadCMS</h2>
            <form onSubmit={ this.handleSubmit.bind(this) }>
                { packageFileName ? [
                <InputGroup>
                    <label>Tiedosto</label>
                    <label class="text-break form-checkbox">
                        <input type="checkbox" checked disabled/>
                        <i class="form-icon"></i> { packageFileName }
                    </label>
                </InputGroup>,
                <InputGroup classes={ this.state.classes.unlockKey }>
                    <label htmlFor="unlockKey" class="form-label">Avausavain</label>
                    <Input
                        vm={ this }
                        name="unlockKey"
                        id="unlockKey"
                        validations={ [['minLength', 32]] }
                        errorLabel="Avausavain"/>
                    <InputError error={ this.state.errors.unlockKey }/>
                </InputGroup>,
                <div class="has-error"><InputError error={ this.state.errorReportedByBacked }/></div>,
                <FormButtons
                    submitButtonText="Asenna päivitys"
                    form={ this.form }/>
                ] : packageFileName === null ? <p>Päivitystiedostoja ei löytynyt. Tiedostot tulisi sijaita <code>/backend</code> -kansiossa.</p> : <LoadingSpinner/> }
            </form>
        </View>;
    }
    /**
     * @access private
     */
    handleSubmit(e) {
        if (!this.form.handleSubmit(e))
            return;
        http.put('/api/updates', {unlockKey: this.state.values.unlockKey})
            .then(info => {
                if (info.ok === 'ok') {
                    env.sessionStorage.radMessage = JSON.stringify(
                        ['Järjestelmä päivitetty.', 'success']);
                    urlUtils.redirect('/', 'hard');
                } else if (info.knownError === 'invalidUnlockKey')
                    this.setState({errorReportedByBacked: 'Virheellinen avain'});
            })
            .catch(env.console.error);
    }
}

export default CmsUpdateView;
