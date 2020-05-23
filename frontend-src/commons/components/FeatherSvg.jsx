import config from '../config.js';

/**
 * @param {{iconId: string; className?: string}} eg. 'activity' (see: feathericons.com)
 */
function FeatherSvg(props) {
    return <svg class={ `feather${!props.className ? '' : ` ${props.className}`}` }>
        <use xlinkHref={ `${config.assetBaseUrl}frontend/assets/feather-sprite.svg#${props.iconId}` }/>
    </svg>;
}

export default FeatherSvg;
