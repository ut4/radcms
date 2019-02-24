#ifndef insn_jsxProducer_h
#define insn_jsxProducer_h

#include "jsx-scanner.h" // Token

struct MyStr {
    unsigned capacity;
    unsigned length;
    char *chars;
};

void
producerInit();

void
producerClear();

void
producerFreeProps();

char*
producerGetResult();

bool
producerProduceTagStart(struct Token *nameToken);

/** Appends $token->lexeme as a javascript string literal. */
bool
producerProduceString(struct Token *token);

/** Appends $token->lexeme as it is. */
bool
producerProduceCode(struct Token *token);

bool
producerProduceObjKey(struct Token *keyToken);

bool
producerProduceCommentOrDoctype(struct Token *contentsToken,
                                const char *pseudoTagName);

bool
producerProduceEmptyAttrs();

bool
producerCloseAttrObj();

bool
producerCloseSelfClosingTag();

bool
producerAddChar(char c);

bool
producerAddChars(const char *str);

bool
producerAddNChars(const char *str, unsigned amount);

unsigned
producerAddComma();

void
producerReplaceChar(unsigned pos, char with);

/**
 * Replaces 'createElement('foo', {'attr': 'val'}...' with
 *          'createElement(directives['foo'], {'attr': 'val'}...'
 */
void
producerPatchTagName(unsigned pos, struct Token *nameToken);

unsigned
producerGetLength();

void myStrInit(struct MyStr *this,  unsigned initialCapacity);
void myStrFreeProps(struct MyStr *this);
char* myStrMakeSpace(struct MyStr *this, unsigned atLeastNumChars);
char *myStrGetTail(struct MyStr *this);

#endif