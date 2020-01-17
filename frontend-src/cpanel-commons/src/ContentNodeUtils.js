class ContentNodeUtils {
    /**
     * @param {ContentNode} contentNode
     */
    static makeTitle(contentNode) {
        if (contentNode.name) return contentNode.name;
        if (contentNode.title) return contentNode.title;
        return '#' + contentNode.id;
    }
}

export default ContentNodeUtils;
