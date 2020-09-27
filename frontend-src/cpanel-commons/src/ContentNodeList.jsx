import ContentNodeUtils from './ContentNodeUtils.js';

/**
 * @param {{contentNodes: Array<ContentNode>; createLinkText: string; noContentNodesContent: preact.VNode; contentType: string; panelIdx?: string;}} props
 */
function ContentNodeList({contentNodes, createLinkText, noContentNodesContent, contentType, panelIdx}) {
    panelIdx = panelIdx || 'none';
    return <div>{
        (contentNodes.length ? contentNodes.map(c =>
            <a href={ `#/edit-content/${c.id}/${contentType}/${panelIdx}` }>
                <span>{ ContentNodeUtils.makeTitle(c) }: </span>
                Muokkaa
            </a>
        ) : [noContentNodesContent]).concat(
            <a href={ `#/add-content/${contentType}/${panelIdx}` }>
                { createLinkText || 'Luo uusi' }
            </a>
        )
    }</div>;
}

export default ContentNodeList;
