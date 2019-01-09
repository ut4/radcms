#include <stdio.h> // fprintf
#include <ctype.h> // tolower
#include <strings.h> // strncasecmp
#include <string.h> // strncmp, strncpy etc.
#include "../include/jsx-transpiler.h"
#include "../include/jsx-scanner.h"
#include "../include/jsx-producer.h"
#include "../include/memory.h"

#define ERR_MAX_LEN 128

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

enum TagType {TYPE_SELF_CLOSING, TYPE_SCRIPT, TYPE_STYLE, TYPE_NONE};

/*
fragment  -> ( element | comment | doctype )? EOF ;
element   -> startTag ( TEXT | element | codeBlock | comment )* endTag?
startTag  -> "<" NAME attr* "/"? ">"
attr      -> NAME ( "=" ( "'" | """ | "{" ) TEXT ( "'" | """ | "}" ) )?
endTag    -> "<" "/" NAME ">"
codeBlock -> "{" ( TEXT | element )+ "}"
comment   -> "<" "!" "-" "-" TEXT? "-" "-" ">"
*/
static void fragment();
static bool element(bool startAlreadyConsumed);
static bool commentOrDoctype();
static bool scriptOrStyleElement(const char *elName);
static bool codeBlock();
static unsigned startTag(bool startAlreadyConsumed, enum TagType *outType);
static bool attrs();
static bool attrCodeBlock(struct Token *keyToken);
static bool tryStartTag();
static bool closingTag();
static bool comment();
static bool dataConfigs();
//
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

#define resetTranspiler() \
    transpiler.hadError = false; \
    transpiler.lastErr[0] = '\0'; \
    sharedErr[0] = '\0'; \
    scannerInit(code); \
    producerClear()

char*
transpilerTranspile(const char *code) {
    resetTranspiler();
    (void)advance(true, SCAN_NAME);
    if (transpiler.current.type != TOKEN_EOF) fragment();
    return !transpiler.hadError ? producerGetResult() : NULL;
}

char*
transpilerTranspileIsx(const char *code) {
    resetTranspiler();
    (void)advance(true, SCAN_NAME);
    if (transpiler.current.type != TOKEN_EOF) {
        if (dataConfigs()) {
            fragment();
            producerAddChars("};}");
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

static void
fragment() {
    unsigned numRoots = 0;
    unsigned lastCommaPos = 0;
    producerAddChar(' ');
    while (transpiler.current.type == TOKEN_LT) {
        if (!(scannerPeek(false) != '!' ? element(false) : commentOrDoctype()) ||
            (lastCommaPos = producerAddComma()) == 0) return;
        numRoots += 1;
    }
    if (numRoots == 1) {
        producerReplaceChar(lastCommaPos, ' ');
    } else if (numRoots > 1) {
        producerReplaceChar(0, '[');
        producerAddChar(']');
    }
}

static bool
element(bool startAlreadyConsumed) {
    enum TagType etype = TYPE_NONE;
    unsigned startTagEndPos = startTag(startAlreadyConsumed, &etype);
    if (startTagEndPos == 0) return false;
    if (etype == TYPE_SELF_CLOSING) return true;
    if (etype == TYPE_SCRIPT) return scriptOrStyleElement("script");
    if (etype == TYPE_STYLE) return scriptOrStyleElement("style");
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
                if (!comment()) return false;
                else childCount += 1;
                continue;
            }
            childCount += 1;
            if (!element(false)) return false;
        } else if (transpiler.current.type == TOKEN_LBRACE) {
            childCount += 1;
            if (!codeBlock()) return false;
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
commentOrDoctype() {
    advance(false, SCAN_NAME); // !
    if (scannerPeek(false) == '-') return comment();
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
    advance(true, TOKEN_TEXT);
    if (transpiler.current.lexemeFrom[transpiler.current.lexemeLen-1] != '>') {
        logError("Expected '>' after doctype");
        return false;
    }
    advance(true, SCAN_TEXT);
    return producerProduceCommentOrDoctype(&emptyToken, "!doctype");
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
    if (strncasecmp(tagNameToken.lexemeFrom, "script", 6) == 0) *outType = TYPE_SCRIPT;
    else if (strncasecmp(tagNameToken.lexemeFrom, "style", 5) == 0) *outType = TYPE_STYLE;
    else if (transpiler.current.type != TOKEN_SLASH) {
        if (isVoidElement(&tagNameToken)) {
            *outType = TYPE_SELF_CLOSING;
            producerCloseSelfClosingTag();
        } // else was regular element
    } else {
        *outType = TYPE_SELF_CLOSING;
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
            if (!attrCodeBlock(&keyToken)) return false;
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
attrCodeBlock(struct Token *keyToken) {
    advance(true, SCAN_TEXT); // "{"
    if (!consumeOr(TOKEN_TEXT, "Expected stuff inside attr {}", false,
                   SCAN_NAME)) return false;
    struct Token startingToken = transpiler.previous;
    unsigned braceLevel = 1;
    while (true) {
        if (
            transpiler.current.type == TOKEN_TEXT ||
            transpiler.current.type == TOKEN_LT ||
            transpiler.current.type == TOKEN_GT
        ) {
            advance(false, SCAN_TEXT);
        } else if (transpiler.current.type == TOKEN_LBRACE) {
            braceLevel++;
            advance(false, SCAN_TEXT);
        } else if (transpiler.current.type == TOKEN_RBRACE) {
            if (--braceLevel < 1) {
                advance(true, SCAN_NAME);
                startingToken.lexemeLen += transpiler.previous.lexemeLen-1;
                goto done;
            } else {
                advance(false, SCAN_TEXT);
            }
        } else {
            logError("Expected TEXT, '{', '}', '<', or '>'");
            return false;
        }
        startingToken.lexemeLen += transpiler.previous.lexemeLen;
    }
    done:
    return producerProduceObjCodeVal(keyToken, &startingToken);
}

static bool
tryStartTag() {
    if (!scannerIsAlpha(scannerPeek(true))) {
        producerAddChar('<');
        advance(false, SCAN_TEXT);
        return false;
    }
    struct Token a = transpiler.current;
    advance(true, SCAN_NAME); // "<"
    a.lexemeLen += transpiler.current.lexemeLen + 1;
    if (transpiler.current.type != TOKEN_NAME) { // wasn't '<foo', append as code
        producerProduceCode(&a);
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
    producerProduceCode(&a);
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
codeBlock() {
    unsigned startingLine = scannerGetCurrentLine();
    advance(true, SCAN_TEXT); // "{"
    unsigned braceLevel = 1;
    unsigned childCount = 0;
    while (true) {
        if (advanceIf(TOKEN_TEXT, false, SCAN_TEXT)) {
            producerProduceCode(&transpiler.previous);
        } else if (transpiler.current.type == TOKEN_GT ||
                   transpiler.current.type == TOKEN_LBRACE) {
            if (transpiler.current.type == TOKEN_LBRACE) braceLevel += 1;
            producerProduceCode(&transpiler.current);
            advance(true, SCAN_TEXT);
        } else if (transpiler.current.type == TOKEN_LT) {
            if (tryStartTag() && // was start tag
                !element(true)) return false;
            // else do nothing, lexemes already processed at tryStartTag
        } else if (transpiler.current.type == TOKEN_RBRACE && braceLevel > 1) {
            braceLevel -= 1;
            producerProduceCode(&transpiler.current);
            advance(false, SCAN_TEXT);
        } else {
            break;
        }
        childCount += 1;
    }
    if (childCount == 0) {
        logError("Expected stuff inside { }");
        return false;
    }
    const char *err = makeError("Expected '}' after code block on line %u",
                                startingLine);
    return consumeOr(TOKEN_RBRACE, err, false, SCAN_TEXT);
}

static bool
comment() {
    advance(false, SCAN_NAME); // -
    if (!consumeOr(TOKEN_DASH, "Expected '-' after '!'", false,
                   SCAN_NAME)) return false;
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

// Isx /////////////////////////////////////////////////////////////////////////

/*
 * dataConfigs -> varDecl?
 * varDecl     -> "{" "@" IDENTIFIER "=" JS_EXPRESSION "}"
 *
 * Example input:
 * ```
 * {@foo = fetchAll('SomeType').where('foo=1')}
 * {@another = fetchAll('SomeType').where('bar=2')}
 * ```
 *
 * Produces:
 * ```
 * function(ddc, url) {
 *     var foo = ddc.fetchAll('SomeType').where('foo=1');
 *     var another ddc.fetchAll('SomeType').where('bar=2');
 *     return function(vTree, pageData) {
 *         foo = ddc.getDataFor(foo);
 *         anther = ddc.getDataFor(foo);
 * ```
 */
#define MAX_VARS 64
#define MAX_VAR_NAME_LEN 128
#define failAndReturn(err) logError(err); return false

static bool varDecl(unsigned startingLine);
static bool validateVarName();

static bool
dataConfigs() {
    #define EXPRS_END "return function(vTree, pageData) {"
    producerAddChars("function(ddc, url) {var fetchAll=ddc.fetchAll.bind(ddc);var fetchOne=ddc.fetchOne.bind(ddc);");
    if (transpiler.current.type != TOKEN_LBRACE) {
        producerAddChars(EXPRS_END);
        return true;
    }
    unsigned startingLine = scannerGetCurrentLine();
    const char *start = transpiler.current.lexemeFrom;
    const unsigned maxNameArrLen = MAX_VARS * 2;
    unsigned vNamePositions[maxNameArrLen];
    unsigned vNameI = 0;
    // Produce each {@name = ...}
    while (advanceIf(TOKEN_LBRACE, true, SCAN_NAME)) {
        if (vNameI >= maxNameArrLen) { failAndReturn("TOO_MANY_VARS"); }
        if (*transpiler.current.lexemeFrom != '@') { failAndReturn("Expected '@' after '{'"); }
        advance(true, SCAN_NAME); // '@' after '{'
        if (!validateVarName()) return false;
        vNamePositions[vNameI] = transpiler.current.lexemeFrom - start;
        vNamePositions[vNameI + 1] = transpiler.current.lexemeLen;
        vNameI += 2;
        if (!varDecl(startingLine)) return false;
    }
    producerAddChars(EXPRS_END);
    // Produce each name = ddc.getDataFor(name);...
    for (unsigned i = 0; i < vNameI; i += 2) {
        const unsigned vNameLen = vNamePositions[i + 1];
        if (vNameLen > MAX_VAR_NAME_LEN) { failAndReturn("VAR_NAME_TOO_LONG"); }
        //
        char vName[vNameLen];
        memcpy(vName, &start[vNamePositions[i]], vNameLen);
        vName[vNameLen] = '\0';
        //
        const char *fmt = "%s=ddc.getDataFor(%s);";
        const unsigned l = vNameLen * 2 + strlen(fmt) - 4 + 1;
        char toDataCall[l]; // <varname>=ddc.getData(<varname>);
        snprintf(toDataCall, l, fmt, vName, vName);
        producerAddChars(toDataCall);
    }
    producerAddChars("return ");
    return true;
    #undef EXPRS_END
}

static bool
varDecl(unsigned startingLine) {
    advance(true, SCAN_NAME); // 'foo' after '@'
    if (transpiler.current.type != TOKEN_EQUAL) {
        makeLexeme(lex, transpiler.previous);
        failAndReturn(makeError("Expected '=' after '@%s'", lex));
    }
    producerAddChars("var ");
    producerProduceCode(&transpiler.previous);
    producerAddChars(" = ");
    advance(true, SCAN_TEXT); // stuff after '='
    unsigned braceLevel = 1;
    while (true) {
        if (advanceIf(TOKEN_TEXT, false, SCAN_TEXT)) {
            producerProduceCode(&transpiler.previous);
        } else if (transpiler.current.type == TOKEN_GT ||
                   transpiler.current.type == TOKEN_LBRACE ||
                   transpiler.current.type == TOKEN_LT) {
            if (transpiler.current.type == TOKEN_LBRACE) braceLevel += 1;
            producerProduceCode(&transpiler.current);
            advance(false, SCAN_TEXT);
        } else if (transpiler.current.type == TOKEN_RBRACE && braceLevel > 1) {
            braceLevel -= 1;
            producerProduceCode(&transpiler.current);
            advance(false, SCAN_TEXT);
        } else {
            break;
        }
    }
    const char *err = makeError("Expected '}' after data declaration on line %u",
                                startingLine);
    if (transpiler.previous.lexemeLen &&
        transpiler.previous.lexemeFrom[transpiler.previous.lexemeLen-1] != ';')
            producerAddChar(';');
    return consumeOr(TOKEN_RBRACE, err, true, SCAN_TEXT);
}

static bool
validateVarName() {
    if (transpiler.current.type != TOKEN_NAME ||
        transpiler.current.lexemeLen == 0) {
        logError("Expected variable name after '@'");
        return false;
    }
    if (!scannerIsAlpha(transpiler.current.lexemeFrom[0])) {
        makeLexeme(lex, transpiler.current);
        logError(makeError("'%s' is not valid variable name", lex));
        return false;
    }
    unsigned i = 1;
    while (i < transpiler.current.lexemeLen) {
        char c = transpiler.current.lexemeFrom[i];
        if (!scannerIsAlpha(c) && !(c > '0' && c < '9')) {
            makeLexeme(lex, transpiler.current);
            logError(makeError("'%s' is not valid variable name", lex));
            return false;
        }
        i += 1;
    }
    return true;
}

#undef MAX_VARS
#undef MAX_VAR_NAME_LEN
#undef failAndReturn

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
