import FeatherSvg from './FeatherSvg.jsx';
import {urlUtils} from '../utils.js';

/**
 * @param {Object} content
 */
function View(props) {
    return <div id="view"><div class="box">
        <button onClick={ () => urlUtils.redirect('/') } class="icon-button">
            <FeatherSvg iconId="x"/>
        </button>
        { props.children }
    </div></div>;
}

export default View;
