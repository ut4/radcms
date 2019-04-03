const TokenType = {
    LT: 0,
    GT: 1,
    NAME: 2,
    TEXT: 3,
    LBRACE: 4,
    RBRACE: 5,
    SLASH: 6,
    DQUOT: 7,
    SQUOT: 8,
    EQUAL: 9,
    SPACE: 10,
    BANG: 11,
    DASH: 12,
    UNKNOWN: 13,
    EOF: 14,
};

class Token {
    constructor(type, start, lexemeLen, str) {
        this.type = type;
        this.start = start;
        this.lexemeLen = lexemeLen;
        this.str = str;
    }
    toLexeme() {
        return this.str.substr(this.start, this.lexemeLen);
    }
}

const ScanMode = {
    NAME: 0,             // Single a-zA-Z [followed by any number of a-zA-Z0-9-_:.]
    TEXT: 1,             // Any character until <, >, { or }
    ATTR_VALUE_DQUOT: 2, // Any character until "
    ATTR_VALUE_SQUOT: 3, // Any character until '
    COMMENT: 4,          // Any character until <, >, ! or -
};

let scanner = {
    src: null,
    curPos: 0,
    lastTokenStart: 0,
    line: 1,
};

scanner.init = function(src) {
    scanner.src = src;
    scanner.curPos = 0;
    scanner.lastTokenStart = 0;
    scanner.line = 1;
    consumeWhiteSpace();
};

scanner.scan = function(doConsumeWhiteSpace, scanMode) {
    if (doConsumeWhiteSpace) consumeWhiteSpace();
    let c = advance();
    switch (c) {
        case 60: return makeSingleCharToken(TokenType.LT);
        case 62: return makeSingleCharToken(TokenType.GT);
        case 123: return makeSingleCharToken(TokenType.LBRACE);
        case 125: return makeSingleCharToken(TokenType.RBRACE);
        default: {
            if (scanMode == ScanMode.NAME || scanMode == ScanMode.COMMENT) {
                if (c == 33) return makeSingleCharToken(TokenType.BANG);
                else if (c == 45) return makeSingleCharToken(TokenType.DASH);
            }
            if (scanMode == ScanMode.NAME) {
                if (c == 47) return makeSingleCharToken(TokenType.SLASH);
                else if (c == 34) return makeSingleCharToken(TokenType.DQUOT);
                else if (c == 39) return makeSingleCharToken(TokenType.SQUOT);
                else if (c == 61) return makeSingleCharToken(TokenType.EQUAL);
                else if (c == 32) return makeSingleCharToken(TokenType.SPACE);
                else if (isNaN(c)) return makeSingleCharToken(TokenType.EOF);
                return scanner.isAlpha(c) // Must begin with a-zA-Z
                    ? makeNameToken()
                    : makeSingleCharToken(TokenType.UNKNOWN);
            }
            if (isNaN(c)) return makeSingleCharToken(TokenType.EOF);
            if (c == 10) scanner.line += 1; // \n
            if (scanMode == ScanMode.TEXT) {
                return makeTextToken(123, 125); // '{', '}'
            } else if (scanMode == ScanMode.COMMENT) {
                return makeTextToken(33, 45); // '!', '-'
            }
            return makeAttrTextToken(c, scanMode);
        }
    }
};

scanner.peek = function() {
    return scanner.src.charCodeAt(scanner.curPos);
};

scanner.peekW = function() {
    let i = scanner.curPos;
    let c = scanner.src.charCodeAt(scanner.curPos);
    while (scanner.isWhiteSpace(c)) c = scanner.src.charCodeAt(++i);
    return c;
};

scanner.isAlpha = function(c) {
    return (c >= 65 && c <= 90) || // 'A' - 'Z'
            (c >= 97 && c <= 122); // 'a' - 'z'
};

scanner.isWhiteSpace = function(c) {
    return c == 32 || // (space)
            c == 10 || // \n
            c == 13 || // \r
            c == 9; // \t
};

scanner.getCurrentLine = function() {
    return scanner.line;
};

// Private funcs ///////////////////////////////////////////////////////////////

function advance() {
    return scanner.src.charCodeAt(scanner.curPos++);
}

function consumeWhiteSpace() {
    let c = scanner.peek();
    while (scanner.isWhiteSpace(c)) {
        if (c == 10) scanner.line += 1; // \n
        advance();
        c = scanner.peek();
    }
}

function makeSingleCharToken(type) {
    scanner.lastTokenStart = scanner.curPos;
    return new Token(type, scanner.curPos - 1, 1, scanner.src);
}

function makeNameToken() {
    scanner.lastTokenStart = scanner.curPos - 1;
    let c = scanner.peek(false);
    while (
        scanner.isAlpha(c) ||
        (c >= 48 && c <= 57) || // 0 - 9
        c == 45 ||             // -
        c == 95 ||             // _
        c == 58 ||             // :
        c == 46                // .
    ) {
        advance();
        c = scanner.peek(false);
    }
    return new Token(TokenType.NAME, scanner.lastTokenStart, scanner.curPos - scanner.lastTokenStart, scanner.src);
}

function makeTextToken(excludeA, excludeB) {
    scanner.lastTokenStart = scanner.curPos - 1;
    let c = scanner.peek(false);
    while (c &&
           c != 60 && // <
           c != 62 && // >
           c != excludeA && c != excludeB) {
        if (c == 10) scanner.line += 1; // \n
        advance();
        c = scanner.peek(false);
    }
    return new Token(TokenType.TEXT, scanner.lastTokenStart, scanner.curPos - scanner.lastTokenStart, scanner.src);
}

function makeAttrTextToken(c, scanMode) {
    scanner.lastTokenStart = scanner.curPos - 1;
    let until = scanMode == ScanMode.ATTR_VALUE_DQUOT ? 34 : 39; // " or '
    if (c == until) {
        scanner.curPos -= 1; // Closing quote, do not consume
        return new Token(TokenType.TEXT, scanner.lastTokenStart, 0, scanner.src);
    }
    c = scanner.peek();
    while (c && c != until) {
        if (c == 10) scanner.line += 1; // \n
        advance();
        c = scanner.peek();
    }
    return new Token(TokenType.TEXT, scanner.lastTokenStart, scanner.curPos - scanner.lastTokenStart, scanner.src);
}

exports.TokenType = TokenType;
exports.ScanMode = ScanMode;
exports.Token = Token;
exports.scanner = scanner;