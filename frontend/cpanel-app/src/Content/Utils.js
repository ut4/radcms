class Utils {
    /**
     * @param {ContentNode} cnode
     */
    static makeTitle(cnode) {
        if (cnode.name) return cnode.name;
        if (cnode.title) return cnode.title;
        return '#' + cnode.id;
    }
}

export default Utils;
