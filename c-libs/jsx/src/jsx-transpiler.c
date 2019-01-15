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
#define MAX_VAR_NAME_LEN 128
#define ISX_OUTER_START "function(fetchAll, fetchOne, url) { "
//                           var batch = fetchAll().where() calls here...
#define ISX_INNER_START     "return function(domTree, getDataFor, directives) { "
//                               batch = getDataFor(batch) calls here...
#define ISX_INNER_END          " return"
//                               domTree.createElement(...,batch.foo)... calls here
#define ISX_OUTER_END       "}; }"

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
input     -> ( code | html )? EOF ;
code      -> TEXT
html      -> ( element | comment | doctype )? ;
element   -> startTag ( TEXT | element | codeBlock | comment )* endTag?
startTag  -> "<" NAME attr* "/"? ">"
attr      -> NAME ( "=" ( "'" | """ | "{" ) TEXT ( "'" | """ | "}" ) )?
endTag    -> "<" "/" NAME ">"
codeBlock -> "{" ( TEXT | element )+ "}"
comment   -> "<" "!" "-" "-" TEXT? "-" "-" ">"
*/
static bool html(enum TagType alreadyConsumedStartEl);
static unsigned code();
static bool element(bool startAlreadyConsumed);
static bool doctypeOrComment(bool startAlreadyConsumed);
static bool scriptOrStyleElement(const char *elName);
static bool codeBlock(struct Token *previous);
static unsigned startTag(bool startAlreadyConsumed, enum TagType *outType);
static bool attrs();
static bool tryStartTag(bool autoProduce);
static bool closingTag();
static bool comment(bool startAlreadyConsumed);
static enum TagType tryCommentOrDoctype();
//
static const char* appendVar(DataConfVar *vars, unsigned varsCount,
                             const char *curCodeStart, const char *fileStart);
static bool endVars(DataConfVar *vars, unsigned varsCount, const char *fileStart);
static struct Token* advance(bool consumeWhiteSpace, enum ScanMode scanMode);
static bool advanceIf(enum TokenType type, bool consumeWhiteSpace,
                      enum ScanMode scanMode);
static bool consumeOr(enum TokenType type, const char *err,
                      bool consumeWhiteSpace, enum ScanMode scanMode);
static void logError(const char *err);

#define makeLexeme(toVarName, token) \
    char toVarName[token.lexemeLen + 1]; \
    memcpy(toVarName, token.lexemeFrom, token.lexemeLen); \
    toVarName[token.lexemeLen] = '\0'

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


char*
transpilerTranspile(const char *src) {
    transpiler.hadError = false;
    transpiler.lastErr[0] = '\0';
    sharedErr[0] = '\0';
    scannerInit(src);
    producerClear();
    (void)advance(true, SCAN_NAME);
    if (transpiler.current.type != TOKEN_EOF) {
        producerAddChars(ISX_OUTER_START);
        if (transpiler.current.type == TOKEN_LT) {
            producerAddChars(ISX_INNER_START);
            producerAddChars(ISX_INNER_END);
            html(TAG_TYPE_NONE);
        } else {
            code();
        }
    }
    producerAddChars(ISX_OUTER_END);
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
appendVar(DataConfVar *vars, unsigned varsCount, const char *curCodeStart,
          const char *fileStart) {
    if (varsCount >= MAX_DATA_CONF_VARS) {
        logError("TOO_MANY_VARS"); return NULL;
    }
    producerAddNChars(curCodeStart, transpiler.current.lexemeFrom - curCodeStart);
    producerAddChars("var ");
    curCodeStart = transpiler.current.lexemeFrom + 1;
    advance(true, SCAN_NAME); // @
    if (transpiler.current.type != TOKEN_NAME) {
        logError("Expected variable name after '@'"); return NULL;
    }
    if (transpiler.current.lexemeLen <= MAX_VAR_NAME_LEN) {
        vars[varsCount] = (DataConfVar){
            .posFromFileStart = transpiler.current.lexemeFrom - fileStart,
            .varNameLen = transpiler.current.lexemeLen
        };
    } else {
        logError("VAR_NAME_TOO_LONG"); return NULL;
    }
    return curCodeStart;
}

static bool
endVars(DataConfVar *vars, unsigned varsCount, const char *fileStart) {
    if (!producerAddChars(ISX_INNER_START)) return false;
    for (unsigned i = 0; i < varsCount; ++i) {
        const unsigned vNameLen = vars[i].varNameLen;
        char vName[vNameLen];
        memcpy(vName, &fileStart[vars[i].posFromFileStart], vNameLen);
        vName[vNameLen] = '\0';
        //
        const char *fmt = "%s=getDataFor(%s);";
        const unsigned l = vNameLen * 2 + strlen(fmt) - 4 + 1; // 4 == %s%s, 1 == \0
        char toDataCall[l]; // <varname>=getDataFor(<varname>);
        snprintf(toDataCall, l, fmt, vName, vName);
        producerAddNChars(toDataCall, l - 1);
    }
    return producerAddChars(ISX_INNER_END);
}

static unsigned
code() {
    const char *fileStart = transpiler.current.lexemeFrom;
    const char *curCodeStart = transpiler.current.lexemeFrom;
    DataConfVar vars[MAX_DATA_CONF_VARS];
    unsigned varsCount = 0;
    bool varsEnded = false;
    bool sQuot = false;
    bool dQuot = false;
    while (transpiler.current.type != TOKEN_EOF) {
        bool notInStr = !sQuot && !dQuot;
        if (transpiler.current.type == TOKEN_LT && notInStr) {
            const char *ltStart = transpiler.current.lexemeFrom;
            enum TagType t = TAG_TYPE_NONE;
            if (scannerPeek(false) == '!') {
                t = tryCommentOrDoctype();
            } else if (tryStartTag(false)) {
                t = TAG_TYPE_NORMAL;
            }
            if (t != TAG_TYPE_NONE) {
                producerAddNChars(curCodeStart, ltStart - curCodeStart);
                if (!varsEnded && !(varsEnded = endVars(vars, varsCount, fileStart))) return 0;
                if (html(t)) { curCodeStart = transpiler.current.lexemeFrom; continue; }
                else return 0;
            }
        } else if (transpiler.current.type == TOKEN_SQUOT && !dQuot) {
            if (!sQuot) sQuot = true;
            else if (transpiler.current.lexemeFrom[-1] != '\\') sQuot = false;
        } else if (transpiler.current.type == TOKEN_DQUOT && !sQuot) {
            if (!dQuot) dQuot = true;
            else if (transpiler.current.lexemeFrom[-1] != '\\') dQuot = false;
        } else if (!varsEnded && notInStr &&
            transpiler.current.type == TOKEN_UNKNOWN &&
            *transpiler.current.lexemeFrom == '@') {
            curCodeStart = appendVar(vars, varsCount, curCodeStart, fileStart);
            if (curCodeStart) varsCount += 1;
            else return false;
            continue;
        }
        advance(false, SCAN_NAME);
    }
    if (transpiler.current.lexemeFrom != curCodeStart) {
        producerAddNChars(curCodeStart, transpiler.current.lexemeFrom - curCodeStart);
    }
    return varsCount;
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
            if (!codeBlock(NULL)) return false;
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

static bool
isVoidElement(struct Token *token) {
    #define MATCH(token, tag, expectedLen) \
        token->lexemeLen == expectedLen && \
        strncasecmp(token->lexemeFrom, tag, expectedLen) == 0
    char b;
    switch (tolower(token->lexemeFrom[0])) {
        case 'a':
            return MATCH(token, "area", 4);
        case 'b':
            if (token->lexemeLen == 1) return false;
            b = token->lexemeFrom[1];
            return ((b == 'r' || b == 'R') && MATCH(token, "br", 2)) ||
                   ((b == 'a' || b == 'A') && MATCH(token, "base", 4));
        case 'c':
            return MATCH(token, "col", 3);
        case 'e':
            return MATCH(token, "embed", 5);
        case 'h':
            return MATCH(token, "hr", 2);
        case 'i':
            if (token->lexemeLen == 1) return false;
            b = token->lexemeFrom[1];
            return ((b == 'm' || b == 'M') && MATCH(token, "img", 3)) ||
                   ((b == 'n' || b == 'N') && MATCH(token, "input", 5));
        case 'l':
            return MATCH(token, "link", 4);
        case 'm':
            return MATCH(token, "meta", 4);
        case 'p':
            return MATCH(token, "param", 5);
        case 's':
            return MATCH(token, "source", 6);
        case 't':
            return MATCH(token, "track", 5);
        case 'w':
            return MATCH(token, "wbr", 3);
    }
    return false;
    #undef MATCH
}

static unsigned
startTag(bool startAlreadyConsumed, enum TagType *outType) {
    if (!startAlreadyConsumed) {
        advance(true, SCAN_NAME); // "<"
        if (!consumeOr(TOKEN_NAME, "Expected start tag name after '<'", true,
                       SCAN_NAME)) return 0;
    }// else "<" and NAME already consumed at tryStartTag
    if (!producerProduceTagStart(&transpiler.previous)) return false;
    struct Token tagNameToken = transpiler.previous;
    if (!attrs()) return false;
    unsigned pos = producerGetLength() - 1;
    if (strncasecmp(tagNameToken.lexemeFrom, "script", 6) == 0) *outType = TAG_TYPE_SCRIPT;
    else if (strncasecmp(tagNameToken.lexemeFrom, "style", 5) == 0) *outType = TAG_TYPE_STYLE;
    else if (transpiler.current.type != TOKEN_SLASH) {
        if (isVoidElement(&tagNameToken)) {
            *outType = TAG_TYPE_SELF_CLOSING;
            producerCloseSelfClosingTag();
        } // else was regular element
    } else {
        *outType = TAG_TYPE_SELF_CLOSING;
        advance(true, SCAN_NAME); // '/'
        producerCloseSelfClosingTag();
    }
    if (!consumeOr(TOKEN_GT, "Expected closing start tag '>'", false,
                   SCAN_TEXT)) return 0;
    return pos;
}

static bool
attrs() {
    if (transpiler.current.type != TOKEN_NAME ||
        transpiler.current.type == TOKEN_SLASH) {
        return producerProduceEmptyAttrs();
    }
    if (!producerAddChar('{')) return false;
    while (advanceIf(TOKEN_NAME, true, SCAN_NAME) ) {
        struct Token keyToken = transpiler.previous;
        if (!advanceIf(TOKEN_EQUAL, true, SCAN_NAME)) { // attr with no value
            if (transpiler.current.type == TOKEN_GT ||
                transpiler.current.type == TOKEN_NAME ||
                transpiler.current.type == TOKEN_SLASH ||
                transpiler.current.type == TOKEN_SPACE) {
                if (!producerProduceObjStringVal(&keyToken, &emptyToken))
                    return false;
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
            if (!producerProduceObjStringVal(&keyToken, &transpiler.previous))
                return false;
            advance(true, SCAN_NAME); // closing
        // "{"
        } else if (transpiler.current.type == TOKEN_LBRACE) {
            if (!codeBlock(&keyToken)) return false;
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
codeBlock(struct Token *previous) {
    unsigned startingLine = scannerGetCurrentLine();
    advance(true, SCAN_NAME); // "{"
    bool isAttr = previous != NULL;
    if (transpiler.current.type == TOKEN_RBRACE) {
        if (!isAttr) logError("Expected stuff inside { }");
        else logError("Expected stuff inside attr { }");
        return false;
    }
    const char *start = transpiler.current.lexemeFrom;
    unsigned braceLevel = 1;
    bool sQuot = false;
    bool dQuot = false;
    while (transpiler.current.type != TOKEN_EOF) {
        bool notInStr = !sQuot && !dQuot;
        if (transpiler.current.type == TOKEN_LBRACE && notInStr) {
            braceLevel += 1;
        } else if (!isAttr && transpiler.current.type == TOKEN_LT && notInStr) {
            const char *ltStart = transpiler.current.lexemeFrom;
            if (tryStartTag(false)) { // was tag
                producerAddNChars(start, ltStart - start);
                if (element(true)) start = transpiler.current.lexemeFrom;
                else return false;
            } // wasn't comment, doctype nor element
            continue;
        } else if (transpiler.current.type == TOKEN_RBRACE && notInStr) {
            if (braceLevel > 1) braceLevel -= 1;
            else break;
        } else if (transpiler.current.type == TOKEN_SQUOT && !dQuot) {
            if (!sQuot) sQuot = true;
            else if (transpiler.current.lexemeFrom[-1] != '\\') sQuot = false;
        } else if (transpiler.current.type == TOKEN_DQUOT && !sQuot) {
            if (!dQuot) dQuot = true;
            else if (transpiler.current.lexemeFrom[-1] != '\\') dQuot = false;
        }
        advance(false, SCAN_NAME);
    }
    if (transpiler.current.lexemeFrom != start) {
        if (!isAttr) {
            producerAddNChars(start, transpiler.current.lexemeFrom - start);
        } else {
            producerProduceObjCodeVal(previous, start,
                                      transpiler.current.lexemeFrom - start);
        }
    }
    if (transpiler.current.type == TOKEN_RBRACE) {
        if (!isAttr) advance(false, SCAN_TEXT);
        else advance(true, SCAN_NAME);
        return true;
    }
    logError(makeError("%s %scode block on line %u",
                       !dQuot && !sQuot ? "Expected '}' after" : "Unterminated string in",
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
