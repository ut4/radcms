#ifndef insn_jsxScanner_h
#define insn_jsxScanner_h

#include <stdbool.h>

enum TokenType {
    TOKEN_LT,
    TOKEN_GT,
    TOKEN_NAME,
    TOKEN_TEXT,
    TOKEN_LBRACE,
    TOKEN_RBRACE,
    TOKEN_SLASH,
    TOKEN_DQUOT,
    TOKEN_SQUOT,
    TOKEN_EQUAL,
    TOKEN_SPACE,
    TOKEN_BANG,
    TOKEN_DASH,
    TOKEN_UNKNOWN,
    TOKEN_EOF
};

struct Token {
    enum TokenType type;
    unsigned lexemeLen;
    const char *lexemeFrom;
};

enum ScanMode {
    SCAN_NAME,             // Single a-zA-Z [followed by any number of a-zA-Z0-9-_:.]
    SCAN_TEXT,             // Any character until <, >, { or }
    SCAN_ATTR_VALUE_DQUOT, // Any character until "
    SCAN_ATTR_VALUE_SQUOT, // Any character until '
    SCAN_COMMENT,          // Any character until <, >, ! or -
};

void
scannerInit(const char *code);

struct Token
scannerScan(bool doConsumeWhiteSpace, enum ScanMode scanMode);

char
scannerPeek(bool skipWhiteSpace);

bool
scannerIsAlpha(char c);

unsigned
scannerGetCurrentLine();

#define makeToken(typeEnum, lexPtr, lexLen) \
    (struct Token){.type=typeEnum, .lexemeLen=lexLen, .lexemeFrom=lexPtr}

#endif