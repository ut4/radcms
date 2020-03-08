import ContentNodeUtils from './ContentNodeUtils.js';

/**
 * @param {{contentNodes: Array<ContentNode>; createLinkText: string; currentPagePath: string; contentType?: string; noContentNodesContent: preact.VNode;}} props
 */
function ContentNodeList(props) {
    return <div>{
        (props.contentNodes.length ? props.contentNodes.map(c =>
            <a href={ '#/edit-content/' + c.id + '/' + props.contentType + '?returnTo=' +
                      encodeURIComponent(props.currentPagePath) }>
                <span>{ ContentNodeUtils.makeTitle(c) }: </span>
                Muokkaa
            </a>
        ) : [props.noContentNodesContent]).concat(
            <a href={ '#/add-content' + (!props.contentType ? '' : '/' + props.contentType) +
                     '?returnTo=' + encodeURIComponent(props.currentPagePath) }>
                { props.createLinkText || 'Luo uusi' }
            </a>
        )
    }</div>;
}

export default ContentNodeList;
