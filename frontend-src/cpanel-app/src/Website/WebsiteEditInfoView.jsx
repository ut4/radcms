import {View, hookForm, FormButtons, InputGroup, Input, InputError} from '@rad-commons';

/**
 * #/edit-website-info: näkymä, jolla käyttäjä voi muokata sivuston perustietoja
 * (nimi, kieli).
 */
class WebsiteEditInfoView extends preact.Component {
    /**
     * @param {Object} props
     */
    constructor(props) {
        super(props);
        this.state = hookForm(this, {name: 'MySite', lang: 'fi'});
    }
    /**
     * @access protected
     */
    render() {
        return <View>
            <h2>Päivitä sivuston tietoja</h2>
            <form onSubmit={ this.handleSubmit.bind(this) }>
                todo
                <FormButtons
                    submitButtonText="Tallenna tiedot"/>
            </form>
        </View>;
    }
    /**
     * @access private
     */
    handleSubmit(e) {
        if (!this.form.handleSubmit(e))
            return;
    }
}

export default WebsiteEditInfoView;
