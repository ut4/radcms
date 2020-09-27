import FeatherSvg from './FeatherSvg.jsx';
import {urlUtils} from '../utils.js';

class View extends preact.Component {
    /**
     * @param {Object} props
     * @access protected
     */
    render({children}) {
        return <div id="view"><div class="box">
            <button onClick={ () => urlUtils.redirect('/') } class="btn btn-icon close">
                <FeatherSvg iconId="x"/>
            </button>
            { children }
        </div></div>;
    }
}

export default View;
