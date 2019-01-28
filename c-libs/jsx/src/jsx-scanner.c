#include "../include/jsx-scanner.h"

struct Scanner {
    const char *cursor;
    const char *lastTokenStart;
    unsigned line;
};
struct Scanner scanner;

static char advance();
static void consumeWhiteSpace();
static struct Token makeSingleCharToken(enum TokenType type);
static struct Token makeNameToken();
static struct Token makeTextToken(const char excludeA, const char excludeB);
static struct Token makeAttrTextToken(char c, enum ScanMode scanMode);

void
scannerInit(const char *code) {
    scanner.cursor = code;
    scanner.lastTokenStart = code;
    scanner.line = 1;
    consumeWhiteSpace();
}

struct Token
scannerScan(bool doConsumeWhiteSpace, enum ScanMode scanMode) {
    if (doConsumeWhiteSpace) consumeWhiteSpace();
    char c = advance();
    switch (c) {
        case '<': return makeSingleCharToken(TOKEN_LT);
        case '>': return makeSingleCharToken(TOKEN_GT);
        case '{': return makeSingleCharToken(TOKEN_LBRACE);
        case '}': return makeSingleCharToken(TOKEN_RBRACE);
        case '\0': return makeSingleCharToken(TOKEN_EOF);
        default: {
            if (scanMode == SCAN_NAME || scanMode == SCAN_COMMENT) {
                if (c == '!') return makeSingleCharToken(TOKEN_BANG);
                else if (c == '-') return makeSingleCharToken(TOKEN_DASH);
            }
            if (scanMode == SCAN_NAME) {
                if (c == '/') return makeSingleCharToken(TOKEN_SLASH);
                else if (c == '"') return makeSingleCharToken(TOKEN_DQUOT);
                else if (c == '\'') return makeSingleCharToken(TOKEN_SQUOT);
                else if (c == '=') return makeSingleCharToken(TOKEN_EQUAL);
                else if (c == ' ') return makeSingleCharToken(TOKEN_SPACE);
                return scannerIsAlpha(c) // Must begin with a-zA-Z
                    ? makeNameToken()
                    : makeSingleCharToken(TOKEN_UNKNOWN);
            }
            if (c == '\n') scanner.line += 1;
            if (scanMode == SCAN_TEXT) {
                return makeTextToken('{', '}');
            } else if (scanMode == SCAN_COMMENT) {
                return makeTextToken('!', '-');
            }
            return makeAttrTextToken(c, scanMode);
        }
    }
}

char
scannerPeek(bool skipWhiteSpace) {
    char c = *scanner.cursor;
    if (!skipWhiteSpace) return c;
    unsigned i = 0;
    while (scannerIsWhiteSpace(c)) c = scanner.cursor[++i];
    return c;
}

bool
scannerIsAlpha(char c) {
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
}

bool
scannerIsWhiteSpace(char c) {
    return c == ' ' || c == '\n' || c == '\r' || c == '\t';
}

unsigned
scannerGetCurrentLine() {
    return scanner.line;
}

////////////////////////////////////////////////////////////////////////////////

static char
advance() {
    scanner.cursor += 1;
    return scanner.cursor[-1];
}

static void
consumeWhiteSpace() {
    char c = scannerPeek(false);
    while (scannerIsWhiteSpace(c)) {
        if (c == '\n') scanner.line += 1;
        (void)advance();
        c = scannerPeek(false);
    }
}

static struct Token
makeSingleCharToken(enum TokenType type) {
    scanner.lastTokenStart = scanner.cursor;
    return makeToken(type, scanner.cursor - 1, 1);
}

static struct Token
makeNameToken() {
    scanner.lastTokenStart = scanner.cursor - 1;
    char c = scannerPeek(false);
    while (
        scannerIsAlpha(c) ||
        (c >= '0' && c <= '9') ||
        c == '-' || c == '_' || c == ':' || c == '.'
    ) {
        (void)advance();
        c = scannerPeek(false);
    }
    return makeToken(TOKEN_NAME, scanner.lastTokenStart,
                     scanner.cursor - scanner.lastTokenStart);
}

static struct Token
makeTextToken(const char excludeA, const char excludeB) {
    scanner.lastTokenStart = scanner.cursor - 1;
    char c = scannerPeek(false);
    while (c != '<' && c != '>' && c != excludeA && c != excludeB && c != '\0') {
        if (c == '\n') scanner.line += 1;
        (void)advance();
        c = scannerPeek(false);
    }
    return makeToken(TOKEN_TEXT, scanner.lastTokenStart,
                     scanner.cursor - scanner.lastTokenStart);
}

static struct Token
makeAttrTextToken(char c, enum ScanMode scanMode) {
    scanner.lastTokenStart = scanner.cursor - 1;
    char until = scanMode == SCAN_ATTR_VALUE_DQUOT ? '"' : '\'';
    if (c == until) {
        scanner.cursor -= 1; // Closing quote, do not consume
        return makeToken(TOKEN_TEXT, scanner.lastTokenStart, 0);
    }
    c = scannerPeek(false);
    while (c != until && c != '\0') {
        if (c == '\n') scanner.line += 1;
        (void)advance();
        c = scannerPeek(false);
    }
    return makeToken(TOKEN_TEXT, scanner.lastTokenStart,
                     scanner.cursor - scanner.lastTokenStart);
}
