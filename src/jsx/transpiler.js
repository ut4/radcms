const {scanner, TokenType, ScanMode} = require('./scanner.js');
const {producer} = require('./producer.js');

const TagType = {
    NORMAL: 0,
    SELF_CLOSING: 1,
    SCRIPT: 2,
    STYLE: 3,
    COMMENT: 4,
    DOCTYPE: 5,
    NONE: 6,
};

const emptyToken = {toLexeme: () => ''};

let transpiler = {
    previous: null,
    current: null,
    hadError: false,
    lastErr: '',
    printErrors: true
};

transpiler.init = function(src) {
    transpiler.previous = null;
    transpiler.current = null;
    transpiler.hadError = false;
    transpiler.lastErr = '';
    scanner.init(src);
    producer.clear();
    advance(true, ScanMode.NAME);
};

transpiler.transpile = function(src) {
    transpiler.init(src);
    if (transpiler.current.type != TokenType.EOF) {
        if (transpiler.current.type == TokenType.LT) {
            html(TagType.NONE);
        } else {
            jsCode(false);
        }
    }
    return !transpiler.hadError ? producer.getResult() : null;
};

const WRAP_JS_START = "var directives = domTree.directives;" +
                          "if (props.ddc) {var url = props.url;" +
                                          "var fetchAll=props.ddc.fetchAll.bind(props.ddc);" +
                                          "var fetchOne=props.ddc.fetchOne.bind(props.ddc);}";
//                         js code here ...
const WRAP_JS_END =      " return";
//                         domTree.createElement(...,batch.foo)... calls here

transpiler.transpileIsx = function(src) {
    transpiler.init(src);
    if (transpiler.current.type != TokenType.EOF) {
        producer.append(WRAP_JS_START);
        if (transpiler.current.type == TokenType.LT) {
            producer.append(WRAP_JS_END);
            html(TagType.NONE);
        } else {
            jsCode(true);
        }
    }
    return !transpiler.hadError ? producer.getResult() : null;
};

transpiler.getLastError = function() {
    return transpiler.lastErr;
};

transpiler.setPrintErrors = function(printErrors) {
    transpiler.printErrors = printErrors;
};

transpiler.isVoidElement = function(str) {
    return {
        AREA: 1,
        BR: 1,
        BASE: 1,
        COL: 1,
        EMBED: 1,
        HR: 1,
        IMG: 1,
        INPUT: 1,
        LINK: 1,
        META: 1,
        PARAM: 1,
        SOURCE: 1,
        TRACK: 1,
        WBR: 1,
    }.hasOwnProperty(str.toUpperCase());
};

// Private funcs ///////////////////////////////////////////////////////////////

function html(alreadyConsumedStartEl) {
    let numRoots = 0;
    let lastCommaPos = 0;
    let p = 0;
    producer.append(' ');
    if (alreadyConsumedStartEl != TagType.NONE) {
        numRoots = 1;
        p = producer.getLength() - 1;
        if ((alreadyConsumedStartEl == TagType.NORMAL && element(true)) ||
            (alreadyConsumedStartEl == TagType.DOCTYPE && doctypeOrComment(true)) ||
            (alreadyConsumedStartEl == TagType.COMMENT && comment(true))) {
            if ((lastCommaPos = producer.produceComma()) == 0) return false;
        } else {
            return false;
        }
    }
    while (transpiler.current.type == TokenType.LT) {
        if (scanner.peek() != 33) { // !
            if (!element(false)) return false;
        } else if (!doctypeOrComment(false)) return false;
        if ((lastCommaPos = producer.produceComma()) == 0) return false;
        numRoots += 1;
    }
    if (numRoots == 1) {
        producer.replace(lastCommaPos, ' ');
    } else if (numRoots > 1) {
        producer.replace(p, '[');
        producer.append(']');
    }
    return true;
}

function isxVarDecl(curCodeStart) {
    let t = transpiler.current;
    producer.append(t.str.substr(curCodeStart, t.start - curCodeStart));
    curCodeStart = transpiler.current.start + 1;
    advance(true, ScanMode.NAME); // @
    producer.append('var ');
    if (transpiler.current.type != TokenType.NAME) {
        logError('Expected variable name after \'@\''); return null;
    }
    return curCodeStart;
}

function jsCode(isDuk) {
    let s = transpiler.current.str;
    let start = transpiler.current.start;
    while (transpiler.current.type != TokenType.EOF) {
        let t = transpiler.current.type;
        if ((t == TokenType.DQUOT || t == TokenType.SQUOT) && !jsString(t)) continue;
        if (t == TokenType.SLASH && !jsComment()) continue;
        else if (t == TokenType.LT) {
            let ltStart = transpiler.current.start;
            let tt = TagType.NONE;
            if (scanner.peek() == 33) { // !
                tt = tryCommentOrDoctype();
            } else if (tryStartTag(false)) {
                tt = TagType.NORMAL;
            }
            if (tt != TagType.NONE) {
                producer.append(s.substr(start, ltStart - start));
                if (isDuk) producer.append(WRAP_JS_END);
                if (html(tt)) { start = transpiler.current.start; continue; }
                else return;
            }
        } else if (
            transpiler.current.type == TokenType.UNKNOWN &&
            transpiler.current.str.charCodeAt(transpiler.current.start) == 64) { // @
            if ((start = isxVarDecl(start)) == null) return;
            continue;
        }
        advance(false, ScanMode.NAME);
    }
    if (transpiler.current.start != start) {
        producer.append(s.substr(start, transpiler.current.start - start));
    }
}

function jsComment() {
    //
    let cur = advance(false, ScanMode.NAME); // "/"
    if (cur.type == TokenType.UNKNOWN && cur.str.charCodeAt(cur.start) == 42) { // *
        do {
            cur = advance(false, ScanMode.NAME);
            if (cur.type == TokenType.SLASH && cur.str.charCodeAt(cur.start-1) == 42) return true;
        } while (cur.type != TokenType.EOF);
    } else if (cur.type == TokenType.SLASH) {
        do {
            cur = advance(false, ScanMode.NAME);
            if (cur.type == TokenType.UNKNOWN && cur.str.charCodeAt(cur.start) == 10) return true; // \n
        } while (cur.type != TokenType.EOF);
    }
    return false; // Wasn't a comment or was unterminated
}

function jsString(t) { // t == TokenType.DQUOT or TokenType.SQUOT
    let cur;
    do {
        cur = advance(false, ScanMode.NAME);
        if (cur.type == t && cur.str.charCodeAt(cur.start - 1) != 92) return true; // \
    } while (cur.type != TokenType.EOF);
    return false; // Unterminated
}

function element(startAlreadyConsumed) {
    let [startTagEndPos, etype] = startTag(startAlreadyConsumed);
    if (startTagEndPos < 0) return false;
    if (etype == TagType.SELF_CLOSING) return true;
    if (etype == TagType.SCRIPT) return scriptOrStyleElement('script');
    if (etype == TagType.STYLE) return scriptOrStyleElement('style');
    let childCount = 0;
    let lastCommaPos = 0;
    while (true) {
        if (childCount > 0 && (lastCommaPos = producer.produceComma()) == 0) return false;
        if (advanceIf(TokenType.TEXT, false, ScanMode.NAME)) {
            producer.produceString(transpiler.previous);
            childCount += 1;
        } else if (transpiler.current.type == TokenType.LT) {
            let p = scanner.peekW();
            if (p == 47) break; // /
            if (p == 33) { // !
                advance(false, ScanMode.NAME); // !
                if (!comment(false)) return false;
                else childCount += 1;
                continue;
            }
            childCount += 1;
            if (!element(false)) return false;
        } else if (transpiler.current.type == TokenType.LBRACE) {
            childCount += 1;
            if (!codeBlock(false)) return false;
        } else {
            break;
        }
    }
    if (childCount == 0) {
        if (transpiler.current.type == TokenType.EOF) {
            logError('Expected closing tag');
            return false;
        }
        producer.produceString(emptyToken);
    } else if (childCount == 1) {
        producer.replace(lastCommaPos, ' ');
    } else {
        producer.replace(startTagEndPos, s => s.substr(0, s.length - 1) + '[');
        producer.replace(lastCommaPos, ']');
    }
    return closingTag();
}

function scriptOrStyleElement(elName) {
    let hadLtSlash = false;
    let textContent = Object.create(transpiler.current);
    textContent.type = TokenType.TEXT;
    textContent.lexemeLen = 0;
    while (true) {
        if (transpiler.current.type == TokenType.LT) {
            textContent.lexemeLen += 1;
            let p = scanner.peekW();
            advance(false, p == 47 || scanner.isAlpha(p) ? ScanMode.NAME : ScanMode.TEXT); // /
        } else if (transpiler.current.type == TokenType.SLASH) {
            hadLtSlash = transpiler.previous.type == TokenType.LT;
            textContent.lexemeLen += 1;
            advance(false, ScanMode.NAME);
        } else if (transpiler.current.type == TokenType.NAME && hadLtSlash &&
            strcasecmp(transpiler.current.toLexeme(), elName) &&
            scanner.peekW() == 62) { // >
            advance(true, ScanMode.NAME); // script|style
            advance(false, ScanMode.TEXT); // >
            break;
        } else if (transpiler.current.type == TokenType.EOF) {
            logError('Unclosed <' + elName + '>');
            return false;
        } else {
            hadLtSlash = false;
            textContent.lexemeLen += transpiler.current.lexemeLen;
            advance(false, ScanMode.TEXT);
        }
    }
    textContent.lexemeLen -= 2; // '</'
    producer.produceString(textContent);
    producer.append(')');
    return true;
}

function startTag(startAlreadyConsumed) {
    let out = [-1, TagType.NONE];
    if (!startAlreadyConsumed) {
        advance(true, ScanMode.NAME); // '<'
        if (!consumeOr(TokenType.NAME, 'Expected start tag name after \'<\'', true,
                       ScanMode.NAME)) return out;
    }// else '<' and NAME already consumed at tryStartTag
    producer.produceTagStart(transpiler.previous);
    let tagNamePos = producer.getLength() - 2;
    let tagNameToken = transpiler.previous;
    if (!attrs()) return out;
    let startTagEnd = producer.getLength() - 1;
    /*
     * Check if the start tag is <JsFunc.../>, <script...>, <style...> or <voidElem...>
     */
    if (transpiler.current.type == TokenType.SLASH) { // <startTag.../>
        out[1] = TagType.SELF_CLOSING;
        advance(true, ScanMode.NAME); // '/'
        if (!transpiler.isVoidElement(tagNameToken.toLexeme())) { // assume a function or variable
            // "createElement('" -> "createElement("
            producer.replace(tagNamePos - 1, s => s.substr(0, s.length - 1));
            // "Foo" -> "directives['Foo']"
            producer.replace(tagNamePos, s => 'directives[\'' + s + '\']');
            // "', " -> ", "
            producer.replace(tagNamePos + 1, s => s.substr(1, s.length));
        }
        producer.closeSelfClosingTag();
    } else if (strcasecmp(tagNameToken.toLexeme(), 'SCRIPT')) {
        out[1] = TagType.SCRIPT;
    } else if (strcasecmp(tagNameToken.toLexeme(), 'STYLE')) {
        out[1] = TagType.STYLE;
    } else { // <startTag...>
        if (transpiler.isVoidElement(tagNameToken.toLexeme())) {
            out[1] = TagType.SELF_CLOSING;
            producer.closeSelfClosingTag();
        }
    }
    if (!consumeOr(TokenType.GT, 'Expected closing start tag \'>\'', false,
                   ScanMode.TEXT)) return out;
    out[0] = startTagEnd;
    return out;
}

function attrs() {
    if (transpiler.current.type != TokenType.NAME ||
        transpiler.current.type == TokenType.SLASH) {
        producer.produceEmptyAttrs();
        return true;
    }
    producer.append('{');
    while (advanceIf(TokenType.NAME, true, ScanMode.NAME) ) {
        producer.produceObjKey(transpiler.previous);
        if (!advanceIf(TokenType.EQUAL, true, ScanMode.NAME)) { // attr with no value
            if (transpiler.current.type == TokenType.GT ||
                transpiler.current.type == TokenType.NAME ||
                transpiler.current.type == TokenType.SLASH ||
                transpiler.current.type == TokenType.SPACE) {
                producer.append('\'\',');
                continue;
            } else {
                logError('Unexpected \'' + transpiler.current.toLexeme() + '\' after empty attribute');
                return false;
            }
        }
        if (transpiler.current.type == TokenType.DQUOT ||
            transpiler.current.type == TokenType.SQUOT) {
            let expect = transpiler.current.type;
            if (!advanceIf(expect, false, expect == TokenType.DQUOT ?
                                            ScanMode.ATTR_VALUE_DQUOT :
                                            ScanMode.ATTR_VALUE_SQUOT)) {
                logError('Expected \'' + expect + '\' after \'=\'');
                return false;
            }
            if (!consumeOr(TokenType.TEXT, 'Expected attr value', false,
                           ScanMode.NAME)) return false;
            producer.produceString(transpiler.previous), producer.produceComma();
            advance(true, ScanMode.NAME); // closing
        // '{'
        } else if (transpiler.current.type == TokenType.LBRACE) {
            if (!codeBlock(true)) return false;
            producer.produceComma();
        } else {
            logError('Unexpected \'' + transpiler.current.toLexeme() + '\' after \'=\'');
            return false;
        }
        if (transpiler.current.type == TokenType.GT) break;
    }
    producer.closeAttrObj();
    return true;
}

function tryStartTag(autoProduce) {
    if (!scanner.isAlpha(scanner.peekW())) {
        if (autoProduce) producer.append('<');
        advance(false, ScanMode.TEXT);
        return false;
    }
    let a = transpiler.current;
    advance(true, ScanMode.NAME); // "<"
    a.lexemeLen += transpiler.current.lexemeLen + 1;
    if (transpiler.current.type != TokenType.NAME) { // wasn't '<foo', append as code
        if (autoProduce) producer.produceCode(a);
        return false;
    }
    let p = scanner.peekW();
    if (p == 62 || scanner.isAlpha(p)) { // was '<foo>', or '<foo attr'
        advance(true, ScanMode.NAME);
        return true;
    } else if (p == 47) { // '<foo/'
        advance(true, ScanMode.NAME); // consume name
        if (scanner.peekW() == 62) return true; // '<foo/>'
        // '<foo/$somethingElse'
    }
    // was '<foo$somethingElse', append as code
    advance(false, ScanMode.TEXT);
    if (autoProduce) producer.produceCode(a);
    return false;
}

function closingTag() {
    if (!consumeOr(TokenType.LT, 'Expected closing tag \'<\'', true,
                   ScanMode.NAME)) return false;
    if (!consumeOr(TokenType.SLASH, 'Expected \'/\' after closing tag \'<\'', true,
                   ScanMode.NAME)) return false;
    if (!consumeOr(TokenType.NAME, 'Expected closing tag name after \'</\'', true,
                   ScanMode.NAME)) return false;
    if (!consumeOr(TokenType.GT, 'Expected \'>\' after closing tag name', false,
                   ScanMode.TEXT)) return false;
    producer.append(')');
    return true;
}

function codeBlock(isAttr) {
    let startingLine = scanner.getCurrentLine();
    let s = transpiler.current.str;
    let start = transpiler.current.start + 1;
    advance(true, ScanMode.NAME); // "{"
    if (transpiler.current.type == TokenType.RBRACE) {
        if (!isAttr) logError('Expected stuff inside { }');
        else logError('Expected stuff inside attr { }');
        return false;
    }
    let braceLevel = 1;
    let hadContent = false;
    let hadUntermString = false;
    let hadComment = false;
    while (transpiler.current.type != TokenType.EOF) {
        let t = transpiler.current.type;
        if ((t == TokenType.DQUOT || t == TokenType.SQUOT) && (hadUntermString = !jsString(t))) continue;
        if ((hadComment = t == TokenType.SLASH) && !jsComment()) continue;
        else if (t == TokenType.LBRACE) braceLevel += 1;
        else if (t == TokenType.LT) {
            let ltStart = transpiler.current.start;
            if (tryStartTag(false)) { // was tag
                producer.append(s.substr(start, ltStart - start));
                if (element(true)) start = transpiler.current.start;
                else return false;
            } // wasn't comment, doctype nor element
            hadContent = true;
            continue;
        } else if (t == TokenType.RBRACE) {
            if (braceLevel > 1) braceLevel -= 1;
            else break;
        }
        hadContent = hadContent || (!hadComment && !scanner.isWhiteSpace(transpiler.current.str.charCodeAt(transpiler.current.start)));
        advance(false, ScanMode.NAME);
    }
    if (transpiler.current.start != start) {
        producer.append(s.substr(start, transpiler.current.start - start));
        if (!hadContent) {
            producer.produceString(emptyToken);
        }
    }
    if (transpiler.current.type == TokenType.RBRACE) {
        if (!isAttr) advance(false, ScanMode.TEXT);
        else advance(true, ScanMode.NAME);
        return true;
    }
    logError((!hadUntermString ? 'Expected \'}\' after' : 'Unterminated string in') +
             ' ' +
             (!isAttr ? '' : 'attr ') +
             'code block on line ' +
             startingLine);
    return false;
}

function comment(startAlreadyConsumed) {
    if (!startAlreadyConsumed) {
        advance(false, ScanMode.NAME); // -
        if (!consumeOr(TokenType.DASH, 'Expected \'-\' after \'!\'', false,
                       ScanMode.NAME)) return false;
    }
    if (!consumeOr(TokenType.DASH, 'Expected \'-\' after \'-\'', false,
                   ScanMode.COMMENT)) return false;
    const f = transpiler.current;// JSON.parse(JSON.stringify(transpiler.current));
    if (transpiler.current.type == TokenType.GT) {
        logError('A comment must not start with \'>\'');
        return false;
    }
    let consecDashes = 0;
    let len = 0;
    while (true) {
        if (advanceIf(TokenType.TEXT, false, ScanMode.COMMENT)) {
            len += transpiler.previous.lexemeLen;
            consecDashes = 0;
        } else if (advanceIf(TokenType.DASH, false, ScanMode.COMMENT)) {
            len += 1;
            consecDashes += 1;
            if (consecDashes == 2 && len >= 4) {
                if (f.str.substr(f.start + len - 4, 4) == '<!--') {
                    logError('A comment must not contain \'<!--\'');
                    return false;
                }
            }
        } else if (transpiler.current.type == TokenType.GT) {
            if (consecDashes >= 2) {
                if (len >= 6 && f.str.substr(f.start + len - 6, 6) == '<!--->') {
                    logError('A comment must not end with \'<!-\'');
                    return false;
                }
                // We're done, undo last '--'
                f.lexemeLen = len - 2;
                break;
            } else if (len <= 0) {
                logError('A comment must not start with \'>\'');
                return false;
            } else if (len == 1 && consecDashes == 1) {
                logError('A comment must not start with \'->\'');
                return false;
            } else {
                len += 1;
                if (len >= 4 && transpiler.previous.type == TokenType.BANG &&
                    f.str.substr(f.start + len - 4, 4) == '--!>') {
                    logError('A comment must not contain \'--!>\'');
                    return false;
                }
                advance(false, ScanMode.COMMENT);
            }
        } else if (transpiler.current.type == TokenType.EOF) {
            logError('Unterminated comment');
            return false;
        } else {
            len += transpiler.current.lexemeLen;
            consecDashes = 0;
            advance(false, ScanMode.COMMENT);
        }
    }
    advance(false, ScanMode.TEXT);
    producer.produceCommentOrDoctype(f, '!--');
    return true;
}

function doctypeOrComment(startAlreadyConsumed) {
    if (!startAlreadyConsumed) {
        advance(false, ScanMode.NAME); // !
        if (scanner.peek() == 45) return comment(false); // -
        //
        advance(true, ScanMode.NAME);
        if (!strcasecmp(transpiler.current.toLexeme(), 'DOCTYPE')) {
            logError('Expected \'DOCTYPE\' after \'<!\'');
            return false;
        }
        advance(true, ScanMode.NAME);
        if (!strcasecmp(transpiler.current.toLexeme(), 'HTML')) {
            logError('Expected \'html\' after \'<!DOCTYPE \'');
            return false;
        }
        advance(true, ScanMode.NAME);
    }
    if (transpiler.current.type != TokenType.GT &&
        transpiler.current.type != TokenType.EOF) {
        advance(true, ScanMode.TEXT);
        if (scanner.peek() == 62) advance(false, ScanMode.NAME); // >
    }
    if (transpiler.current.type != TokenType.GT) {
        logError('Expected \'>\' after doctype');
        return false;
    }
    advance(true, ScanMode.TEXT);
    producer.produceCommentOrDoctype(emptyToken, '!doctype');
    return true;
}

function tryCommentOrDoctype() {
    advance(false, ScanMode.NAME); // <
    advance(false, ScanMode.NAME); // !
    if (transpiler.current.type == TokenType.DASH) {
        advance(false, ScanMode.NAME);
        return TagType.COMMENT;
    }
    if (transpiler.current.type == TokenType.SPACE) advance(true, ScanMode.NAME);
    if (transpiler.current.type == TokenType.NAME &&
        strcasecmp(transpiler.current.toLexeme(), "DOCTYPE")) {
        advance(true, ScanMode.NAME);
        if (transpiler.current.type == TokenType.NAME &&
            strcasecmp(transpiler.current.toLexeme(), "HTML")) {
            advance(true, ScanMode.TEXT);
            return TagType.DOCTYPE;
        }
    }
    return TagType.NONE;
}

////////////////////////////////////////////////////////////////////////////////

function advance(consumeWhiteSpace, scanMode) {
    transpiler.previous = transpiler.current;
    transpiler.current = scanner.scan(consumeWhiteSpace, scanMode);
    return transpiler.current;
}

function advanceIf(tokenType, consumeWhiteSpace, scanMode) {
    if (transpiler.current.type == tokenType) {
        advance(consumeWhiteSpace, scanMode);
        return true;
    }
    return false;
}

function consumeOr(tokenType, err, consumeWhiteSpace, scanMode) {
    if (!advanceIf(tokenType, consumeWhiteSpace, scanMode)) {
        logError(err);
        return false;
    }
    return true;
}

function logError(message) {
    if (transpiler.hadError) return;
    transpiler.lastErr = message + ' on line ' + scanner.getCurrentLine();
    if (transpiler.printErrors) {
        console.log(transpiler.lastErr);
    }
    transpiler.hadError = true;
}

function strcasecmp(a, b) {
    return a.toUpperCase() == b.toUpperCase();
}

exports.transpiler = transpiler;