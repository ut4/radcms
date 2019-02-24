#include <stdio.h> // fprintf
#include <ctype.h> // tolower
#include <strings.h> // strncasecmp
#include <string.h> // strncmp, strncpy etc.
#include "../include/jsx-transpiler.h"
#include "../include/jsx-scanner.h"
#include "../include/jsx-producer.h"
#include "../include/memory.h"

#define ERR_MAX_LEN 128
#define MAX_DATA_CONF_VARS 64
#define WRAP_JS_START "function(domTree, props) {" \
                          "var directives = domTree.directives;" \
                          "if (props.ddc) {var url = props.url;" \
                                          "var fetchAll=props.ddc.fetchAll.bind(props.ddc);" \
                                          "var fetchOne=props.ddc.fetchOne.bind(props.ddc);}"
//                         js code here ...
#define WRAP_JS_END      " return"
//                         domTree.createElement(...,batch.foo)... calls here
#define WRAP_END       "}"

struct Transpiler {
    struct Token previous;
    struct Token current;
    bool printErrors;
    bool hadError;
    char lastErr[ERR_MAX_LEN];
};

struct Transpiler transpiler;
struct Token emptyToken;
char sharedErr[ERR_MAX_LEN];

enum TagType {
    TAG_TYPE_NORMAL,
    TAG_TYPE_SELF_CLOSING,
    TAG_TYPE_SCRIPT,
    TAG_TYPE_STYLE,
    TAG_TYPE_COMMENT,
    TAG_TYPE_DOCTYPE,
    TAG_TYPE_NONE,
};

typedef struct {
    unsigned posFromFileStart;
    unsigned varNameLen;
} DataConfVar;

/*
input     -> ( jsCode | html )? EOF ;
jsCode    -> ( jsString | jsComment | ANY )
jsString  -> ( """ "'" ) ANY? ( """ "'" )
jsComment -> ( "/" "*" ANY? "*" "/" ) | ( "/" "/" ANY? "\n" )
html      -> ( element | comment | doctype )? ;
element   -> startTag ( ANY | element | codeBlock | comment )* endTag?
startTag  -> "<" NAME attr* "/"? ">"
attr      -> NAME ( "=" ( "'" | """ | "{" ) ANY ( "'" | """ | "}" ) )?
endTag    -> "<" "/" NAME ">"
codeBlock -> "{" ( jsString | jsComment | element | ANY )+ "}"
comment   -> "<" "!" "-" "-" ANY? "-" "-" ">"
*/
static bool html(enum TagType alreadyConsumedStartEl);
static void jsCode(bool isDuk);
static bool jsComment();
static bool jsString(enum TokenType t);
static bool element(bool startAlreadyConsumed);
static bool doctypeOrComment(bool startAlreadyConsumed);
static bool scriptOrStyleElement(const char *elName);
static bool codeBlock(bool isAttr);
static unsigned startTag(bool startAlreadyConsumed, enum TagType *outType);
static bool attrs();
static bool tryStartTag(bool autoProduce);
static bool closingTag();
static bool comment(bool startAlreadyConsumed);
static enum TagType tryCommentOrDoctype();
//
static const char* isxVarDecl(const char *curCodeStart);
static struct Token* advance(bool consumeWhiteSpace, enum ScanMode scanMode);
static bool advanceIf(enum TokenType type, bool consumeWhiteSpace,
                      enum ScanMode scanMode);
static bool consumeOr(enum TokenType type, const char *err,
                      bool consumeWhiteSpace, enum ScanMode scanMode);
static void logError(const char *err);

#define makeError(fmt, ...) \
    (snprintf(sharedErr, ERR_MAX_LEN, fmt, ##__VA_ARGS__), sharedErr)

void
transpilerInit() {
    transpiler.printErrors = true;
    transpiler.hadError = false;
    transpiler.lastErr[0] = '\0';
    sharedErr[0] = '\0';
    producerInit();
    emptyToken = (struct Token){TOKEN_NAME, 0, NULL};
}

void
transpilerFreeProps() {
    producerFreeProps();
}

#define transpileInit() \
    transpiler.hadError = false; \
    transpiler.lastErr[0] = '\0'; \
    sharedErr[0] = '\0'; \
    scannerInit(src); \
    producerClear(); \
    (void)advance(true, SCAN_NAME)

char*
transpilerTranspileDuk(const char *src) {
    transpileInit();
    if (transpiler.current.type != TOKEN_EOF) {
        producerAddChars(WRAP_JS_START);
        if (transpiler.current.type == TOKEN_LT) {
            producerAddChars(WRAP_JS_END);
            html(TAG_TYPE_NONE);
        } else {
            jsCode(true);
        }
    }
    producerAddChars(WRAP_END);
    return !transpiler.hadError ? producerGetResult() : NULL;
}

char*
transpilerTranspile(const char *src) {
    transpileInit();
    if (transpiler.current.type != TOKEN_EOF) {
        if (transpiler.current.type == TOKEN_LT) {
            html(TAG_TYPE_NONE);
        } else {
            jsCode(false);
        }
    }
    return !transpiler.hadError ? producerGetResult() : NULL;
}

char*
transpilerGetLastError() {
    return transpiler.lastErr;
}

void
transpilerSetPrintErrors(bool printErrors) {
    transpiler.printErrors = printErrors;
}

bool
transpilerIsVoidElement(const char *tagName, unsigned tagNameLen) {
    #define MATCH(tag, expectedLen) \
        tagNameLen == expectedLen && \
        strncasecmp(tagName, tag, expectedLen) == 0
    char b;
    switch (tolower(tagName[0])) {
        case 'a':
            return MATCH("area", 4);
        case 'b':
            if (tagNameLen == 1) return false;
            b = tagName[1];
            return ((b == 'r' || b == 'R') && MATCH("br", 2)) ||
                   ((b == 'a' || b == 'A') && MATCH("base", 4));
        case 'c':
            return MATCH("col", 3);
        case 'e':
            return MATCH("embed", 5);
        case 'h':
            return MATCH("hr", 2);
        case 'i':
            if (tagNameLen == 1) return false;
            b = tagName[1];
            return ((b == 'm' || b == 'M') && MATCH("img", 3)) ||
                   ((b == 'n' || b == 'N') && MATCH("input", 5));
        case 'l':
            return MATCH("link", 4);
        case 'm':
            return MATCH("meta", 4);
        case 'p':
            return MATCH("param", 5);
        case 's':
            return MATCH("source", 6);
        case 't':
            return MATCH("track", 5);
        case 'w':
            return MATCH("wbr", 3);
    }
    return false;
    #undef MATCH
}

static bool
html(enum TagType alreadyConsumedStartEl) {
    unsigned numRoots = 0;
    unsigned lastCommaPos = 0;
    unsigned p = 0;
    producerAddChar(' ');
    if (alreadyConsumedStartEl != TAG_TYPE_NONE) {
        numRoots = 1;
        p = producerGetLength() - 1;
        if ((alreadyConsumedStartEl == TAG_TYPE_NORMAL && element(true)) ||
            (alreadyConsumedStartEl == TAG_TYPE_DOCTYPE && doctypeOrComment(true)) ||
            (alreadyConsumedStartEl == TAG_TYPE_COMMENT && comment(true))) {
            if ((lastCommaPos = producerAddComma()) == 0) return false;
        } else {
            return false;
        }
    }
    while (transpiler.current.type == TOKEN_LT) {
        if (scannerPeek(false) != '!') {
            if (!element(false)) return false;
        } else if (!doctypeOrComment(false)) return false;
        if ((lastCommaPos = producerAddComma()) == 0) return false;
        numRoots += 1;
    }
    if (numRoots == 1) {
        producerReplaceChar(lastCommaPos, ' ');
    } else if (numRoots > 1) {
        producerReplaceChar(p, '[');
        producerAddChar(']');
    }
    return true;
}

static const char*
isxVarDecl(const char *curCodeStart) {
    producerAddNChars(curCodeStart, transpiler.current.lexemeFrom - curCodeStart);
    curCodeStart = transpiler.current.lexemeFrom + 1;
    advance(true, SCAN_NAME); // @
    producerAddChars("var ");
    if (transpiler.current.type != TOKEN_NAME) {
        logError("Expected variable name after '@'"); return NULL;
    }
    return curCodeStart;
}

static void
jsCode(bool isDuk) {
    const char *curCodeStart = transpiler.current.lexemeFrom;
    while (transpiler.current.type != TOKEN_EOF) {
        enum TokenType t = transpiler.current.type;
        if ((t == TOKEN_DQUOT || t == TOKEN_SQUOT) && !jsString(t)) continue;
        if (t == TOKEN_SLASH && !jsComment()) continue;
        else if (t == TOKEN_LT) {
            const char *ltStart = transpiler.current.lexemeFrom;
            enum TagType t = TAG_TYPE_NONE;
            if (scannerPeek(false) == '!') {
                t = tryCommentOrDoctype();
            } else if (tryStartTag(false)) {
                t = TAG_TYPE_NORMAL;
            }
            if (t != TAG_TYPE_NONE) {
                producerAddNChars(curCodeStart, ltStart - curCodeStart);
                if (isDuk) producerAddChars(WRAP_JS_END);
                if (html(t)) { curCodeStart = transpiler.current.lexemeFrom; continue; }
                else return;
            }
        } else if (
            transpiler.current.type == TOKEN_UNKNOWN &&
            *transpiler.current.lexemeFrom == '@') {
            if (!(curCodeStart = isxVarDecl(curCodeStart))) return;
            continue;
        }
        advance(false, SCAN_NAME);
    }
    if (transpiler.current.lexemeFrom != curCodeStart) {
        producerAddNChars(curCodeStart, transpiler.current.lexemeFrom - curCodeStart);
    }
}

static bool
jsComment() {
    #define advanceUntil(untilExpr) do { \
        advance(false, SCAN_NAME); \
        if (untilExpr) return true; \
    } while (transpiler.current.type != TOKEN_EOF)
    //
    advance(false, SCAN_NAME); // "/"
    if (transpiler.current.type == TOKEN_UNKNOWN && *transpiler.current.lexemeFrom == '*') {
        advanceUntil(transpiler.current.type == TOKEN_SLASH && transpiler.current.lexemeFrom[-1] == '*');
    } else if (transpiler.current.type == TOKEN_SLASH) {
        advanceUntil(transpiler.current.type == TOKEN_UNKNOWN && *transpiler.current.lexemeFrom == '\n');
    }
    #undef advanceUntil
    return false; // Wasn't a comment or was unterminated
}

static bool
jsString(enum TokenType t) { // t == TOKEN_DQUOT or TOKEN_SQUOT
    do {
        advance(false, SCAN_NAME);
        if (transpiler.current.type == t && transpiler.current.lexemeFrom[-1] != '\\') return true;
    } while (transpiler.current.type != TOKEN_EOF);
    return false; // Unterminated
}

static bool
element(bool startAlreadyConsumed) {
    enum TagType etype = TAG_TYPE_NONE;
    unsigned startTagEndPos = startTag(startAlreadyConsumed, &etype);
    if (startTagEndPos == 0) return false;
    if (etype == TAG_TYPE_SELF_CLOSING) return true;
    if (etype == TAG_TYPE_SCRIPT) return scriptOrStyleElement("script");
    if (etype == TAG_TYPE_STYLE) return scriptOrStyleElement("style");
    unsigned childCount = 0;
    unsigned lastCommaPos = 0;
    while (true) {
        if (childCount > 0 && (lastCommaPos = producerAddComma()) == 0) return false;
        if (advanceIf(TOKEN_TEXT, false, SCAN_NAME)) {
            producerProduceString(&transpiler.previous);
            childCount += 1;
        } else if (transpiler.current.type == TOKEN_LT) {
            char p = scannerPeek(true);
            if (p == '/') break;
            if (p == '!') {
                advance(false, SCAN_NAME); // !
                if (!comment(false)) return false;
                else childCount += 1;
                continue;
            }
            childCount += 1;
            if (!element(false)) return false;
        } else if (transpiler.current.type == TOKEN_LBRACE) {
            childCount += 1;
            if (!codeBlock(false)) return false;
        } else {
            break;
        }
    }
    if (childCount == 0) {
        if (transpiler.current.type == TOKEN_EOF) {
            logError("Expected closing tag");
            return false;
        }
        producerProduceString(&emptyToken);
    } else if (childCount == 1) {
        producerReplaceChar(lastCommaPos, ' ');
    } else {
        producerReplaceChar(startTagEndPos, '[');
        producerReplaceChar(lastCommaPos, ']');
    }
    return closingTag();
}

static bool
scriptOrStyleElement(const char *elName) {
    bool hadLtSlash = false;
    const unsigned elNameLen = strlen(elName);
    struct Token textContent = transpiler.current;
    textContent.type = TOKEN_TEXT;
    textContent.lexemeLen = 0;
    while (true) {
        if (transpiler.current.type == TOKEN_LT) {
            textContent.lexemeLen += 1;
            char p = scannerPeek(true);
            advance(false, p == '/' || scannerIsAlpha(p) ? SCAN_NAME : SCAN_TEXT);
        } else if (transpiler.current.type == TOKEN_SLASH) {
            hadLtSlash = transpiler.previous.type == TOKEN_LT;
            textContent.lexemeLen += 1;
            advance(false, SCAN_NAME);
        } else if (transpiler.current.type == TOKEN_NAME && hadLtSlash &&
            strncasecmp(transpiler.current.lexemeFrom, elName, elNameLen) == 0 &&
            scannerPeek(true) == '>') {
            advance(true, SCAN_NAME); // script|style
            advance(false, SCAN_TEXT); // >
            break;
        } else if (transpiler.current.type == TOKEN_EOF) {
            logError(makeError("Unclosed <%s>", elName));
            return false;
        } else {
            hadLtSlash = false;
            textContent.lexemeLen += transpiler.current.lexemeLen;
            advance(false, SCAN_TEXT);
        }
    }
    textContent.lexemeLen -= 2; // '</'
    producerProduceString(&textContent);
    producerAddChar(')');
    return true;
}

#define isVoidElement(token) \
    transpilerIsVoidElement(token.lexemeFrom, token.lexemeLen)

static unsigned
startTag(bool startAlreadyConsumed, enum TagType *outType) {
    if (!startAlreadyConsumed) {
        advance(true, SCAN_NAME); // "<"
        if (!consumeOr(TOKEN_NAME, "Expected start tag name after '<'", true,
                       SCAN_NAME)) return 0;
    }// else "<" and NAME already consumed at tryStartTag
    if (!producerProduceTagStart(&transpiler.previous)) return false;
    unsigned createElemTagNameStrEnd = producerGetLength() - strlen("', ");
    struct Token tagNameToken = transpiler.previous;
    if (!attrs()) return false;
    unsigned startTagEnd = producerGetLength() - 1;
    /*
     * Check if the start tag is <JsFunc.../>, <script...>, <style...> or <voidElem...>
     */
    if (transpiler.current.type == TOKEN_SLASH) { // <startTag.../>
        *outType = TAG_TYPE_SELF_CLOSING;
        advance(true, SCAN_NAME); // '/'
        if (!isVoidElement(tagNameToken)) { // assume a function or variable
            // createElement('Foo'... -> createElement(directives['Foo']...
            producerPatchTagName(createElemTagNameStrEnd - tagNameToken.lexemeLen - 1,
                                 &tagNameToken);
        }
        producerCloseSelfClosingTag();
    } else if (strncasecmp(tagNameToken.lexemeFrom, "script", 6) == 0) {
        *outType = TAG_TYPE_SCRIPT;
    } else if (strncasecmp(tagNameToken.lexemeFrom, "style", 5) == 0) {
        *outType = TAG_TYPE_STYLE;
    } else { // <startTag...>
        if (isVoidElement(tagNameToken)) {
            *outType = TAG_TYPE_SELF_CLOSING;
            producerCloseSelfClosingTag();
        }
    }
    if (!consumeOr(TOKEN_GT, "Expected closing start tag '>'", false,
                   SCAN_TEXT)) return 0;
    return startTagEnd;
}

static bool
attrs() {
    if (transpiler.current.type != TOKEN_NAME ||
        transpiler.current.type == TOKEN_SLASH) {
        return producerProduceEmptyAttrs();
    }
    if (!producerAddChar('{')) return false;
    while (advanceIf(TOKEN_NAME, true, SCAN_NAME) ) {
        if (!producerProduceObjKey(&transpiler.previous)) return false;
        if (!advanceIf(TOKEN_EQUAL, true, SCAN_NAME)) { // attr with no value
            if (transpiler.current.type == TOKEN_GT ||
                transpiler.current.type == TOKEN_NAME ||
                transpiler.current.type == TOKEN_SLASH ||
                transpiler.current.type == TOKEN_SPACE) {
                if (!producerAddChars("'',")) return false;
                continue;
            } else {
                logError(makeError("Unexpected '%c' after empty attribute",
                                   *transpiler.current.lexemeFrom));
                return false;
            }
        }
        if (transpiler.current.type == TOKEN_DQUOT ||
            transpiler.current.type == TOKEN_SQUOT) {
            enum TokenType expect = transpiler.current.type;
            if (!advanceIf(expect, false, expect == TOKEN_DQUOT ?
                                              SCAN_ATTR_VALUE_DQUOT :
                                              SCAN_ATTR_VALUE_SQUOT)) {
                logError(makeError("Expected '%c' after '='", expect));
                return false;
            }
            if (!consumeOr(TOKEN_TEXT, "Expected attr value", false,
                           SCAN_NAME)) return false;
            if (!producerProduceString(&transpiler.previous) || !producerAddComma())
                return false;
            advance(true, SCAN_NAME); // closing
        // "{"
        } else if (transpiler.current.type == TOKEN_LBRACE) {
            if (!codeBlock(true) || !producerAddComma()) return false;
        } else {
            logError(makeError("Unexpected '%c' after '='",
                               *transpiler.current.lexemeFrom));
            return false;
        }
        if (transpiler.current.type == TOKEN_GT) break;
    }
    return producerCloseAttrObj();
}

static bool
tryStartTag(bool autoProduce) {
    if (!scannerIsAlpha(scannerPeek(true))) {
        if (autoProduce) producerAddChar('<');
        advance(false, SCAN_TEXT);
        return false;
    }
    struct Token a = transpiler.current;
    advance(true, SCAN_NAME); // "<"
    a.lexemeLen += transpiler.current.lexemeLen + 1;
    if (transpiler.current.type != TOKEN_NAME) { // wasn't '<foo', append as code
        if (autoProduce) producerProduceCode(&a);
        return false;
    }
    char p = scannerPeek(true);
    if (p == '>' || scannerIsAlpha(p)) { // was '<foo>', or '<foo attr'
        advance(true, SCAN_NAME);
        return true;
    } else if (p == '/') { // '<foo/'
        advance(true, SCAN_NAME); // consume name
        if (scannerPeek(true) == '>') return true; // '<foo/>'
        // '<foo/$somethingElse'
    }
    // was '<foo$somethingElse', append as code
    advance(false, SCAN_TEXT);
    if (autoProduce) producerProduceCode(&a);
    return false;
}

static bool
closingTag() {
    if (!consumeOr(TOKEN_LT, "Expected closing tag '<'", true,
                   SCAN_NAME)) return false;
    if (!consumeOr(TOKEN_SLASH, "Expected '/' after closing tag '<'", true,
                   SCAN_NAME)) return false;
    if (!consumeOr(TOKEN_NAME, "Expected closing tag name after '</'", true,
                   SCAN_NAME)) return false;
    if (!consumeOr(TOKEN_GT, "Expected '>' after closing tag name", false,
                   SCAN_TEXT)) return false;
    return producerAddChar(')');
}

static bool
codeBlock(bool isAttr) {
    unsigned startingLine = scannerGetCurrentLine();
    const char *start = transpiler.current.lexemeFrom+1;
    advance(true, SCAN_NAME); // "{"
    if (transpiler.current.type == TOKEN_RBRACE) {
        if (!isAttr) logError("Expected stuff inside { }");
        else logError("Expected stuff inside attr { }");
        return false;
    }
    unsigned braceLevel = 1;
    bool hadContent = false;
    bool hadUntermString = false;
    bool hadComment = false;
    while (transpiler.current.type != TOKEN_EOF) {
        enum TokenType t = transpiler.current.type;
        if ((t == TOKEN_DQUOT || t == TOKEN_SQUOT) && (hadUntermString = !jsString(t))) continue;
        if ((hadComment = t == TOKEN_SLASH) && !jsComment()) continue;
        else if (t == TOKEN_LBRACE) braceLevel += 1;
        else if (t == TOKEN_LT) {
            const char *ltStart = transpiler.current.lexemeFrom;
            if (tryStartTag(false)) { // was tag
                producerAddNChars(start, ltStart - start);
                if (element(true)) start = transpiler.current.lexemeFrom;
                else return false;
            } // wasn't comment, doctype nor element
            hadContent = true;
            continue;
        } else if (t == TOKEN_RBRACE) {
            if (braceLevel > 1) braceLevel -= 1;
            else break;
        }
        hadContent = hadContent || (!hadComment && !scannerIsWhiteSpace(*transpiler.current.lexemeFrom));
        advance(false, SCAN_NAME);
    }
    if (transpiler.current.lexemeFrom != start) {
        producerAddNChars(start, transpiler.current.lexemeFrom - start);
        if (!hadContent) {
            producerProduceString(&emptyToken);
        }
    }
    if (transpiler.current.type == TOKEN_RBRACE) {
        if (!isAttr) advance(false, SCAN_TEXT);
        else advance(true, SCAN_NAME);
        return true;
    }
    logError(makeError("%s %scode block on line %u",
                       !hadUntermString ? "Expected '}' after" : "Unterminated string in",
                       !isAttr ? "" : "attr ", startingLine));
    return false;
}

static bool
comment(bool startAlreadyConsumed) {
    if (!startAlreadyConsumed) {
        advance(false, SCAN_NAME); // -
        if (!consumeOr(TOKEN_DASH, "Expected '-' after '!'", false,
                       SCAN_NAME)) return false;
    }
    if (!consumeOr(TOKEN_DASH, "Expected '-' after '-'", false,
                   SCAN_COMMENT)) return false;
    struct Token f = transpiler.current;
    if (transpiler.current.type == TOKEN_GT) {
        logError("A comment must not start with '>'");
        return false;
    }
    unsigned consecDashes = 0;
    int len = 0;
    while (true) {
        if (advanceIf(TOKEN_TEXT, false, SCAN_COMMENT)) {
            len += transpiler.previous.lexemeLen;
            consecDashes = 0;
        } else if (advanceIf(TOKEN_DASH, false, SCAN_COMMENT)) {
            len += 1;
            consecDashes += 1;
            if (consecDashes == 2 && len >= 4) {
                if (strncmp(&f.lexemeFrom[len-4], "<!--", 4) == 0) {
                    logError("A comment must not contain '<!--'");
                    return false;
                }
            }
        } else if (transpiler.current.type == TOKEN_GT) {
            if (consecDashes >= 2) {
                if (len >= 6 && strncmp(&f.lexemeFrom[len-6], "<!--->", 6) == 0) {
                    logError("A comment must not end with '<!-'");
                    return false;
                }
                // We're done, undo last '--'
                f.lexemeLen = len - 2;
                break;
            } else if (len <= 0) {
                logError("A comment must not start with '>'");
                return false;
            } else if (len == 1 && consecDashes == 1) {
                logError("A comment must not start with '->'");
                return false;
            } else {
                len += 1;
                if (len >= 4 && transpiler.previous.type == TOKEN_BANG &&
                    strncmp(&f.lexemeFrom[len-4], "--!>", 4) == 0) {
                    logError("A comment must not contain '--!>'");
                    return false;
                }
                advance(false, SCAN_COMMENT);
            }
        } else if (transpiler.current.type == TOKEN_EOF) {
            logError("Unterminated comment");
            return false;
        } else {
            len += transpiler.current.lexemeLen;
            consecDashes = 0;
            advance(false, SCAN_COMMENT);
        }
    }
    advance(false, SCAN_TEXT);
    return producerProduceCommentOrDoctype(&f, "!--");
}

static bool
doctypeOrComment(bool startAlreadyConsumed) {
    if (!startAlreadyConsumed) {
        advance(false, SCAN_NAME); // !
        if (scannerPeek(false) == '-') return comment(false);
        //
        advance(true, SCAN_NAME);
        if (strncasecmp(transpiler.current.lexemeFrom, "DOCTYPE", 7) != 0) {
            logError("Expected 'DOCTYPE' after '<!'");
            return false;
        }
        advance(true, SCAN_NAME);
        if (strncasecmp(transpiler.current.lexemeFrom, "html", 4) != 0) {
            logError("Expected 'html' after '<!DOCTYPE '");
            return false;
        }
        advance(true, SCAN_NAME);
    }
    if (transpiler.current.type != TOKEN_GT &&
        transpiler.current.type != TOKEN_EOF) {
        advance(true, SCAN_TEXT);
        if (scannerPeek(false) == '>') advance(false, SCAN_NAME);
    }
    if (transpiler.current.type != TOKEN_GT) {
        logError("Expected '>' after doctype");
        return false;
    }
    advance(true, SCAN_TEXT);
    return producerProduceCommentOrDoctype(&emptyToken, "!doctype");
}

static enum TagType
tryCommentOrDoctype() {
    advance(false, SCAN_NAME); // <
    advance(false, SCAN_NAME); // !
    if (transpiler.current.type == TOKEN_DASH) {
        advance(false, SCAN_NAME);
        return TAG_TYPE_COMMENT;
    }
    if (transpiler.current.type == TOKEN_SPACE) advance(true, SCAN_NAME);
    if (transpiler.current.type == TOKEN_NAME &&
        strncasecmp(transpiler.current.lexemeFrom, "DOCTYPE", 7) == 0) {
        advance(true, SCAN_NAME);
        if (transpiler.current.type == TOKEN_NAME &&
            strncasecmp(transpiler.current.lexemeFrom, "html", 4) == 0) {
            advance(true, SCAN_TEXT);
            return TAG_TYPE_DOCTYPE;
        }
    }
    return TAG_TYPE_NONE;
}

// Private helpers /////////////////////////////////////////////////////////////

static struct Token*
advance(bool consumeWhiteSpace, enum ScanMode scanMode) {
    transpiler.previous = transpiler.current;
    transpiler.current = scannerScan(consumeWhiteSpace, scanMode);
    return &transpiler.current;
}

static bool
advanceIf(enum TokenType type, bool consumeWhiteSpace, enum ScanMode scanMode) {
    if (transpiler.current.type == type) {
        advance(consumeWhiteSpace, scanMode);
        return true;
    }
    return false;
}

static bool
consumeOr(enum TokenType type, const char *err, bool consumeWhiteSpace,
          enum ScanMode scanMode) {
    if (!advanceIf(type, consumeWhiteSpace, scanMode)) {
        logError(err);
        return false;
    }
    return true;
}

static void
logError(const char *err) {
    if (transpiler.hadError) return;
    sprintf(transpiler.lastErr, "%s on line %u", err, scannerGetCurrentLine());
    if (transpiler.printErrors) {
        fprintf(stderr, "%s", transpiler.lastErr);
    }
    transpiler.hadError = true;
}
