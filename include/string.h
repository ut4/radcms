#ifndef insn_string_h
#define insn_string_h

#include "../include/memory.h"

#define STR_APPEND(to, str, amount) \
    memcpy(to, str, amount); \
    to += amount

/** A continous array of sring length + string -pairs, eg. (3foo4bars2fu...). */
typedef struct {
    unsigned tubeLength;   // Filled length, chars
    unsigned tubeCapacity; // Allocated length, chars/bytes
    char *tube;
    char *tail;
} StrTube;

StrTube strTubeMake();
void strTubeInit(StrTube *this);
void strTubeFreeProps(StrTube *this);
void strTubePush(StrTube *this, const char *value);

typedef struct {
    StrTube *strTube;
    char *cursor;
    unsigned pos;
} StrTubeReader;

StrTubeReader strTubeReaderMake(StrTube *strTube);
char* strTubeReaderNext(StrTubeReader *this);

#endif