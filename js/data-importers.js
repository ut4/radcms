var xml = require('xml-reader.js');
var commons = require('common-services.js');

/**
 * @param {string} type 'wp'
 * @param {any} arg
 */
exports.import = function(type, arg) {
    var data = null;
    var errors = null;
    if (type == 'wp') data = wpXmlFileToInsaneData(arg);
    errors = _validateData(data);
    if (errors) throw new Error(errors);
    errors = _insertComponents(data.components);
    if (errors) throw new Error(errors);
};

/**
 * @param {string} wpFilePath '/path/to/my-wp-site.xml'
 */
function wpXmlFileToInsaneData(wpFilePath) {
    var xmlReader = new xml.XmlReader();
    var n = xmlReader.parse(wpFilePath);
    if (!(n = n.getFirstChild()) || n.name != 'rss' ||
        !(n = n.getFirstChild()) || n.name != 'channel' ||
        !(n = n.getFirstChild('item'))) {
        throw new TypeError('Expected rss > channel > item');
    }
    var out = {components: []};
    do {
        var titleNode = n.getFirstChild('title');
        if (!titleNode) continue;
        var postNameNode = n.getFirstChild('wp:post_name');
        if (!postNameNode) continue;
        var postTypeNode = n.getFirstChild('wp:post_type');
        if (!postTypeNode) continue;
        var postType = postTypeNode.getFirstChild().getContent();
        if (postType != 'post' && postType != 'page') continue;
        var contentNode = n.getFirstChild('content:encoded');
        if (!contentNode) continue;
        //
        out.components.push({
            name: postNameNode.getFirstChild().getContent(),
            json: {
                title: titleNode.getContent(),
                body: contentNode.getFirstChild().getContent()
            },
            componentTypeName: 'Article'
        });
    } while ((n = n.getNextSibling()) && n.name == 'item');
    return out;
}

/**
@param {dics[]} data
@returns {null|string}
*/
function _validateData(data) {
	if (!data.components || !data.components.length)
		return 'data.components must be a non-empty array';
	if (data.components.length > 40)
		return 'Batch insert not implemented (too many components)';
	if (data.componentTypes)
		console.log('Got data.componentTypes, ignoring');
	var errors = [];
	if (data.components) {
		data.components.forEach(function(c, i) {
			if (!c.name)
				errors.push('component.name is required (at ['+i+'])');
			if (!c.json)
				errors.push('component.json is required (at ['+i+'])');
			if (!c.componentTypeName)
				errors.push('component.componentTypeName is required (at ['+i+'])');
        });
    }
    return !errors.length ? null : errors.join('\n');
}

/**
@param {dict[]} components
@returns {null|string}
*/
function _insertComponents(components) {
    var sql = 'INSERT INTO components (`name`, `json`, componentTypeName) VALUES ';
    var holders = components.map(function() { return '(?,?,?)'; });
    if (commons.db.insert(sql + holders.join(','), function(stmt) {
            components.forEach(function(c, i) {
                stmt.bindString(i * 3, c.name);
                stmt.bindString(i * 3 + 1, JSON.stringify(c.json));
                stmt.bindString(i * 3 + 2, c.componentTypeName);
            });
        }) > 0) {
        console.log('[Info]: Inserted ' + components.length + ' components.');
        return null;
    }
    return 'Failed to insert components';
}