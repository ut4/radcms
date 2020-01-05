import {components} from '../../../rad-commons.js';
const {MyLink} = components;
import CNodeUtils from './Utils.js';

/**
 * @param {{contentNodes: Array<ContentNode>; createLinkText: string; currentPageUrl: string; contentType?: string;}} props
 */
function ContentNodeList(props) {
    return $el('div', null, ...
        props.contentNodes.map(c =>
            $el(MyLink, {to: '/edit-content/' + c.id + '/' + props.contentType + '?returnTo=' +
                             encodeURIComponent(props.currentPagePath)},
                $el('span', null, CNodeUtils.makeTitle(c) + ': '), 'Muokkaa')
        ).concat(
            $el(MyLink, {to: '/add-content' + (!props.contentType ? '' : '/' + props.contentType) +
                             '?returnTo=' + encodeURIComponent(props.currentPagePath)},
                props.createLinkText || 'Luo uusi')
        )
    );
}

export default ContentNodeList;
