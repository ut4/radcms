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
            <img src={ urlUtils.makeAssetUrl('frontend/assets/logo.png') }/>
            <div class="container box info">
                Täytä sähköpostiosoitteesi tai käyttäjätunnuksesi alle, niin lähetämme salasanan palautuslinkin sähköpostilla.
            </div>
            { !this.state.message
                ? null
                : <div class={ `container box ${this.state.message.level}` }>{ this.state.message.text }</div>
            }
            <InputGroup classes={ this.state.classes.usernameOrEmail }>
                <label htmlFor="usernameOrEmail">Email tai käyttäjänimi</label>
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
