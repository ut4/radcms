import FeatherSvg from './FeatherSvg.jsx';

class View extends preact.Component {
    /**
     * @param {Object} props
     * @access protected
     */
    render({children}) {
        return <div id="view"><div class="box">
            <a href="#/" class="btn btn-icon close"><FeatherSvg iconId="x"/></a>
            { children }
        </div></div>;
    }
}

export default View;
