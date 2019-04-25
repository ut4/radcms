/**
 * # data-importers.js
 *
 * todo
 *
 */

 /**
 * @param {string} type 'wp'
 * @param {any} arg
 */
exports.import = function(type, arg) {
    throw new TypeError('Not implemented');
    var data = null;
    var errors = null;
    if (type == 'wp') data = wpXmlFileToRadData(arg);
    errors = _validateData(data);
    if (errors) throw new Error(errors);
    errors = _insertContentNodes(data.contentNodes);
    if (errors) throw new Error(errors);
};

/**
 * @param {string} wpFilePath '/path/to/my-wp-site.xml'
 */
function wpXmlFileToRadData(wpFilePath) {
    var xmlReader = new xml.XmlReader();
    var n = xmlReader.parse(wpFilePath);
    if (!(n = n.getFirstChild()) || n.name != 'rss' ||
        !(n = n.getFirstChild()) || n.name != 'channel' ||
        !(n = n.getFirstChild('item'))) {
        throw new TypeError('Expected rss > channel > item');
    }
    var out = {contentNodes: []};
    do {
        var titleEl = n.getFirstChild('title');
        if (!titleEl) continue;
        var postNameEl = n.getFirstChild('wp:post_name');
        if (!postNameEl) continue;
        var postTypeEl = n.getFirstChild('wp:post_type');
        if (!postTypeEl) continue;
        var postType = postTypeEl.getFirstChild().getContent();
        if (postType != 'post' && postType != 'page') continue;
        var contentEl = n.getFirstChild('content:encoded');
        if (!contentEl) continue;
        //
        out.contentNodes.push({
            name: postNameEl.getFirstChild().getContent(),
            json: {
                title: titleEl.getContent(),
                body: contentEl.getFirstChild().getContent()
            },
            contentTypeName: 'Article'
        });
    } while ((n = n.getNextSibling()) && n.name == 'item');
    return out;
}

/**
@param {dics[]} data
@returns {null|string}
*/
function _validateData(data) {
	if (!data.contentNodes || !data.contentNodes.length)
		return 'data.contentNodes must be a non-empty array';
	if (data.contentNodes.length > 40)
		return 'Batch insert not implemented (too many contentNodes)';
	if (data.contentTypes)
		console.log('Got data.contentTypes, ignoring');
	var errors = [];
	if (data.contentNodes) {
		data.contentNodes.forEach(function(c, i) {
			if (!c.name)
				errors.push('content.name is required (at ['+i+'])');
			if (!c.json)
				errors.push('content.json is required (at ['+i+'])');
			if (!c.contentTypeName)
				errors.push('content.contentTypeName is required (at ['+i+'])');
        });
    }
    return !errors.length ? null : errors.join('\n');
}

/**
@param {dict[]} nodes
@returns {null|string}
*/
function _insertContentNodes(nodes) {
    var sql = 'INSERT INTO contentNodes (`name`, `json`, contentTypeName) VALUES ';
    var holders = nodes.map(function() { return '(?,?,?)'; });
    if (commons.db.insert(sql + holders.join(','), function(stmt) {
            nodes.forEach(function(c, i) {
                stmt.bindString(i * 3, c.name);
                stmt.bindString(i * 3 + 1, JSON.stringify(c.json));
                stmt.bindString(i * 3 + 2, c.contentTypeName);
            });
        }) > 0) {
        commons.log('[Info]: Inserted ' + nodes.length + ' content nodes.');
        return null;
    }
    return 'Failed to insert content nodes';
}