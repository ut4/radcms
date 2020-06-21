import {http, urlUtils, hookForm, InputGroup, Input, InputError, FormButtons} from '@rad-commons';
import {translateError} from './commons.js';

class RequestPassResetApp extends preact.Component {
    /**
     * @param {Object} props
     */
    constructor(props) {
        super(props);
        this.state = Object.assign(hookForm(this, {usernameOrEmail: ''}),
                                   {message: null});
    }
    /**
     * @access protected
     */
    render() {
        return <form onSubmit={ e => this.handleSubmit(e) }>
            <div class="text-center">
                <img src={ urlUtils.makeAssetUrl('frontend/assets/rad-logo.svg') }/>
            </div>
            <div class="box info mb-10">
                Täytä sähköpostiosoitteesi tai käyttäjätunnuksesi alle, niin lähetämme salasanan palautuslinkin sähköpostilla.
            </div>
            { !this.state.message
                ? null
                : <div class={ `box ${this.state.message.level} mb-10` }>{ this.state.message.text }</div>
            }
            <InputGroup classes={ this.state.classes.usernameOrEmail }>
                <label htmlFor="usernameOrEmail" class="form-label">Email tai käyttäjänimi</label>
                <Input vm={ this } name="usernameOrEmail" id="usernameOrEmail"
                    errorLabel="Email tai käyttäjänimi" validations={ [['required']] }/>
                <InputError error={ this.state.errors.usernameOrEmail }/>
            </InputGroup>
            <FormButtons
                buttons={ ['submit'] }
                submitButtonText="Lähetä palautuslinkki"/>
        </form>;
    }
    /**
     * @access private
     */
    handleSubmit(e) {
        if (!this.form.handleSubmit(e))
            return;
        http.post('/api/request-password-reset',
                  {usernameOrEmail: this.state.values.usernameOrEmail})
            .then(info => {
                if (info.ok) this.setState({message: {text: 'Palautuslinkki lähetetty.',
                                                      level: 'info'}});
                else if (info.err) this.setState({message: {
                    text: translateError(info.err),
                    level: 'error',
                }});
                else throw new Error('wut?');
            })
            .catch(() => {
                this.setState({message: {text: 'Jokin meni pieleen.',
                                         level: 'error'}});
            });
    }
}

export default RequestPassResetApp;
