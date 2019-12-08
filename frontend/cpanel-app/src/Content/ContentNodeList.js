import {components} from '../../../rad-commons.js';
const {MyLink} = components;
import CNodeUtils from './Utils.js';

/**
 * @param {{cnodes: Array<ContentNode>; createLinkText: string; currentPageUrl: string; contentType?: string;}} props
 */
function ContentNodeList(props) {
    return $el('div', null,
        $el('ul', null, props.cnodes.map(c =>
            $el('li', null,
                $el('span', null, CNodeUtils.makeTitle(c)),
                $el(MyLink, {to: '/edit-content/' + c.id + '/' + props.contentType + '?returnTo=' +
                                 encodeURIComponent(props.currentPagePath)}, 'Muokkaa')
            )
        )),
        $el('div', null,
            $el(MyLink, {to: '/add-content' + (!props.contentType ? '' : '/' + props.contentType) +
                             '?returnTo=' + encodeURIComponent(props.currentPagePath)},
                props.createLinkText || 'Luo uusi')
        )
    );
}

export default ContentNodeList;
