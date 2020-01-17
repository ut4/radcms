import ContentNodeUtils from './ContentNodeUtils.js';

/**
 * @param {{contentNodes: Array<ContentNode>; createLinkText: string; currentPageUrl: string; contentType?: string;}} props
 */
function ContentNodeList(props) {
    return <div>{
        props.contentNodes.map(c =>
            <a href={ '#/edit-content/' + c.id + '/' + props.contentType + '?returnTo=' +
                      encodeURIComponent(props.currentPagePath) }>
                <span>{ ContentNodeUtils.makeTitle(c) }: </span>
                Muokkaa
            </a>
        ).concat(
            <a ref={ '#/add-content' + (!props.contentType ? '' : '/' + props.contentType) +
                     '?returnTo=' + encodeURIComponent(props.currentPagePath) }>
                { props.createLinkText || 'Luo uusi' }
            </a>
        )
    }</div>;
}

export default ContentNodeList;
