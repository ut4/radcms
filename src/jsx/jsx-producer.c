#include <assert.h>
#include <stdbool.h>
#include <string.h>
#include "../../include/jsx/jsx-producer.h"
#include "../../include/common/memory.h"

struct MyStr result;

#define RESULT_GROW_AMOUNT 128
// http://www.ecma-international.org/ecma-262/9.0/index.html#sec-literals-string-literals
// Ignore U+2028 (LINE SEPARATOR) and U+2029 (PARAGRAPH SEPARATOR) for now...
#define needsEscaping(c) (c == '\n' || c == '\r' || c == '\\' || c == '\'')

#define appendChar(c) \
    *tail++ = c; \
    result.length += 1

#define appendStr(str, len) \
    memcpy(tail, str, len); \
    tail += len; \
    result.length += len

void
producerInit() {
    myStrInit(&result, 1);
}

void
producerClear() {
    result.length = 0;
}

void
producerFreeProps() {
    myStrFreeProps(&result);
}

char*
producerGetResult() {
    if (result.chars[result.length] != '\0')
        result.chars[result.length++] = '\0';
    return result.chars;
}

static bool
doProduceStartTag(const char *name, unsigned nameLen) {
    const char *a = "vTree.createElement('";
    const char *b = "', ";
    const unsigned aLen = strlen(a);
    const unsigned bLen = strlen(b);
    char *tail = myStrMakeSpace(&result, result.length + aLen + nameLen + bLen);
    appendStr(a, aLen);
    appendStr(name, nameLen);
    appendStr(b, bLen);
    return true;
}

bool
producerProduceTagStart(struct Token *nameToken) {
    return doProduceStartTag(nameToken->lexemeFrom, nameToken->lexemeLen);
}

static char
getEsc(char c) {
    if (c == '\n') return 'n';
    if (c == '\r') return 'r';
    if (c == '\'') return '\'';
    if (c == '\\') return '\\';
    return '-';
}

static unsigned
getNumEscapableSeqs(struct Token *token) {
    unsigned nAdditionalSlashesNeeded = 0;
    const char *start = token->lexemeFrom;
    unsigned unescapedLen = token->lexemeLen;
    for (unsigned i = 0; i < unescapedLen; ++i) {
        nAdditionalSlashesNeeded += (unsigned)needsEscaping(start[i]);
    }
    return nAdditionalSlashesNeeded;
}

static bool
appendEscapedString(char *tail, const char *lexemeStart, unsigned lexemeLen,
                    unsigned finalLen) {
    appendChar('\'');
    if (finalLen > 0) { // finalLen = lexemeLen + additionalEscapeSlashCount
        if (lexemeLen == finalLen) { // didn't contain anything that needed escaping
            appendStr(lexemeStart, lexemeLen);
        } else {
            bool isEsc = needsEscaping(lexemeStart[0]);
            unsigned curFrom = 0;
            for (unsigned i = 0; i < lexemeLen; ) {
                if (isEsc) {
                    appendStr(&lexemeStart[curFrom], i - curFrom);
                    appendChar('\\');
                    appendChar(getEsc(lexemeStart[i]));
                    curFrom = ++i;
                }
                // Increment "i" until next escapable is found
                while (i < lexemeLen) {
                    char c = lexemeStart[i];
                    if ((isEsc = needsEscaping(c))) break;
                    i += 1;
                }
                // Found one, goto loop start
                if (isEsc) continue;
                // We're done
                appendStr(&lexemeStart[curFrom], i - curFrom);
                break;
            }
        }
    }
    appendChar('\'');
    return true;
    #undef needsEscaping
}

bool
producerProduceString(struct Token *token) {
    unsigned finalLen = token->lexemeLen + getNumEscapableSeqs(token);
    char *tail = myStrMakeSpace(&result, result.length + finalLen +
                                         2); // quote * 2
    return appendEscapedString(tail, token->lexemeFrom, token->lexemeLen, finalLen);
}

bool
producerProduceCode(struct Token *token) {
    char *tail = myStrMakeSpace(&result, result.length + token->lexemeLen);
    appendStr(token->lexemeFrom, token->lexemeLen);
    return true;
}

bool
producerProduceObjStringVal(struct Token *keyToken, struct Token *valueToken) {
    unsigned finalLen = valueToken->lexemeLen + getNumEscapableSeqs(valueToken);
    char *tail = myStrMakeSpace(&result, result.length + keyToken->lexemeLen +
                                         finalLen +
                                         6); // ': ' + quote*4
    appendChar('\'');
    appendStr(keyToken->lexemeFrom, keyToken->lexemeLen);
    appendStr("': ", 3);
    appendEscapedString(tail, valueToken->lexemeFrom, valueToken->lexemeLen,
                        finalLen);
    (void)producerAddComma();
    return true;
}

bool
producerProduceObjCodeVal(struct Token *keyToken, struct Token *valueToken) {
    char *tail = myStrMakeSpace(&result, result.length + keyToken->lexemeLen +
                                         valueToken->lexemeLen + 4); // ': ' + quote*2
    appendChar('\'');
    appendStr(keyToken->lexemeFrom, keyToken->lexemeLen);
    appendStr("': ", 3);
    appendStr(valueToken->lexemeFrom, valueToken->lexemeLen);
    (void)producerAddComma();
    return true;
}

bool
producerProduceCommentOrDoctype(struct Token *contentsToken,
                                const char *pseudoTagName) {
    return doProduceStartTag(pseudoTagName, strlen(pseudoTagName)) &&
            producerProduceEmptyAttrs() &&
            producerProduceString(contentsToken) &&
            producerAddChar(')');
}

bool
producerProduceEmptyAttrs() {
    const char *a = "null, ";
    const unsigned aLen = strlen(a);
    char *tail = myStrMakeSpace(&result, result.length + aLen);
    appendStr(a, aLen);
    return true;
}

bool
producerCloseAttrObj() {
    char *tail = myStrMakeSpace(&result, result.length + 3);
    appendStr("}, ", 3);
    return true;
}

bool
producerCloseSelfClosingTag() {
    char *tail = myStrMakeSpace(&result, result.length + 5);
    appendStr("null)", 5);
    return true;
}

bool
producerAddChar(char c) {
    char *tail = myStrMakeSpace(&result, result.length + 1);
    appendChar(c);
    return true;
}

bool
producerAddChars(const char *str) {
    const unsigned len = strlen(str);
    char *tail = myStrMakeSpace(&result, result.length + len);
    appendStr(str, len);
    return true;
}

unsigned
producerAddComma() {
    char *tail = myStrMakeSpace(&result, result.length + 1);
    appendChar(',');
    return result.length - 1;
}

void
producerReplaceChar(unsigned pos, char with) {
    result.chars[pos] = with;
}

unsigned
producerGetLength() {
    return result.length;
}

void myStrInit(struct MyStr *this, unsigned initialCapacity) {
    this->length = 0;
    if (initialCapacity > 0) {
        this->capacity = 0;
        this->chars = myStrMakeSpace(this, initialCapacity);
    } else {
        this->capacity = 0;
        this->chars = NULL;
    }
}
void myStrFreeProps(struct MyStr *this) {
    FREE_ARR(char, this->chars, this->capacity);
    myStrInit(this, 0);
}
char* myStrMakeSpace(struct MyStr *this, unsigned atLeastNumChars) {
    if (atLeastNumChars > this->capacity) {
        unsigned oldCapacity = this->capacity;
        // Always round up to the next multiple of RESULT_GROW_AMOUNT
        this->capacity = atLeastNumChars + (RESULT_GROW_AMOUNT -
                                            atLeastNumChars % RESULT_GROW_AMOUNT);
        this->chars = ARRAY_GROW(this->chars, char, oldCapacity, this->capacity);
    }
    return myStrGetTail(this);
}
char *myStrGetTail(struct MyStr *this) {
    return this->chars + this->length;
}
