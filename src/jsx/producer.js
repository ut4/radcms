let result = [];

let producer = {};

producer.clear = function () {
    result = [];
};

producer.getResult = function() {
    return result.join('');
};

producer.getLength = function() {
    return result.length;
};

producer.append = function(c) {
    result.push(c);
};

producer.produceCode = producer.append;

producer.replace = function(pos, replacement) {
    if (typeof replacement === 'string') {
        result[pos] = replacement;
    } else {
        result[pos] = replacement(result[pos]);
    }
};

producer.produceString = function(token) {
    appendEscapedString(token.toLexeme());
};

producer.produceTagStart = function(token) {
    doProduceTagStart(token.toLexeme());
};

producer.produceEmptyAttrs = function() {
    producer.append('null, ');
};

producer.produceComma = function() {
    producer.append(',');
    return producer.getLength() - 1;
};

producer.produceObjKey = function(keyToken) {
    producer.append('\''),
    producer.append(keyToken.toLexeme()),
    producer.append('\': ');
};

producer.produceCommentOrDoctype = function(contentsToken, pseudoTagName) {
    doProduceTagStart(pseudoTagName),
    producer.append('null, '),
    appendEscapedString(contentsToken.toLexeme()),
    producer.append(')');
};

producer.closeSelfClosingTag = function() {
    producer.append('null)');
};

producer.closeAttrObj = function() {
    producer.append('}, ');
};

// Private funcs ///////////////////////////////////////////////////////////////

function doProduceTagStart(name) {
    result.push('domTree.createElement(\'', name, '\', ');
}

function appendEscapedString(str) {
    let lexemeLen = str.length;
    if (!lexemeLen) { producer.append('\'\''); return; }
    producer.append('\'');
    let isEsc = needsEscaping(str.charCodeAt(0));
    let curFrom = 0;
    for (let i = 0; i < lexemeLen; ) {
        if (isEsc) {
            producer.append(str.substr(curFrom, i - curFrom));
            producer.append('\\');
            producer.append(getEsc(str.charCodeAt(i)));
            curFrom = ++i;
        }
        // Increment i until a escapable is found
        while (i < lexemeLen) {
            let c = str.charCodeAt(i);
            if ((isEsc = needsEscaping(c))) break;
            i += 1;
        }
        // Found one, goto loop start
        if (isEsc) continue;
        // We're done
        producer.append(str.substr(curFrom, i - curFrom));
        break;
    }
    producer.append('\'');
}

// http://www.ecma-international.org/ecma-262/9.0/index.html#sec-literals-string-literals
// Ignore U+2028 (LINE SEPARATOR) and U+2029 (PARAGRAPH SEPARATOR) for now...
function needsEscaping(c) {
    return c == 10 ||  // \n
            c == 13 || // \r
            c == 39 || // '
            c == 92;   // \
}

function getEsc(c) {
    if (c == 10) return 'n';
    if (c == 13) return 'r';
    if (c == 39) return '\'';
    if (c == 92) return '\\';
    return '-';
}

exports.producer = producer;