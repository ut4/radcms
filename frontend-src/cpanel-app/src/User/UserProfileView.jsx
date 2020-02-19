import {http, View} from '@rad-commons';

/**
 * #/me
 */
class UserProfileView extends preact.Component {
    /**
     * @param {Object} props
     */
    constructor(props) {
        super(props);
        this.state = {user: null, message: ''};
        http.get('/api/users/me')
            .then(user => {
                if (user) this.setState({user});
                else this.setState({message: 'Käyttäjää ei löytynyt'});
            })
            .catch(() => {
                this.setState({message: 'Jokin meni pieleen'});
            });
    }
    /**
     * @access protected
     */
    render() {
        return <View><div>
            <h2>Profiili</h2>
            <div>
            { this.state.user
                ? <p>Moi <b>{ this.state.user.username }</b>.</p>
                : !this.state.message
                    ? null
                    : <p>{ this.state.message}</p>
            }</div>
        </div></View>;
    }
}

export default UserProfileView;
