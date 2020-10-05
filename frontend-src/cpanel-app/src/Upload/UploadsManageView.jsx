import {View} from '@rad-commons';
import UploadsManager from './UploadsManager.jsx';

/**
 * #/manage-uploads: näkymä, jolla käyttäjä voi selata serverille ladattuja kuvia,
 * ja ladata niitä lisää.
 */
class UploadsManageView extends preact.Component {
    /**
     * @access protected
     */
    render() {
        return <View>
            <h2>Lataukset</h2>
            <UploadsManager onEntryClicked={ () => null }/>
        </View>;
    }
}

export default UploadsManageView;
