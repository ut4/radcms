import {View} from '@rad-commons';

/**
 * #/me
 */
class UserProfileView extends preact.Component {
    /**
     * @param {Object} props
     */
    constructor(props) {
        super(props);
    }
    /**
     * @access protected
     */
    render() {
        return <View><div>
            <h2>Profiili</h2>
            <div>Hello</div>
        </div></View>;
    }
}


export default UserProfileView;
