import {urlUtils, InputGroup, Input, http} from '@rad-commons';
import {translateError} from './commons.js';

class RequestPassResetApp extends preact.Component {
    /**
     * @param {Object} props
     */
    constructor(props) {
        super(props);
        this.state = {usernameOrEmail: '', message: null};
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
            <InputGroup label="Email tai käyttäjänimi">
                <Input onInput={ e => this.setState({usernameOrEmail: e.target.value}) }
                       value={ this.state.usernameOrEmail }
                       id="usernameOrEmail"
                       required/>
            </InputGroup>
            <div class="form-buttons">
                <button class="nice-button" type="submit">Lähetä palautuslinkki</button>
            </div>
        </form>;
    }
    /**
     * @access private
     */
    handleSubmit(e) {
        e.preventDefault();
        http.post('/api/request-password-reset', {usernameOrEmail: this.state.usernameOrEmail})
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
