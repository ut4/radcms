#ifndef insn_string_h
#define insn_string_h

#include "../include/memory.h"

#define STR_APPEND(to, str, amount) \
    memcpy(to, str, amount); \
    to += amount

/** A continous array of sring length + string -pairs, eg. (3foo4bars2fu...). */
typedef struct {
    unsigned length;       // Amount of strings
    unsigned tubeLength;   // Total filled length, amount of chars/bytes
    unsigned tubeCapacity; // Total allocated length, abount of chars/bytes
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
void strTubeReaderInit(StrTubeReader *this, StrTube *strTube);
char* strTubeReaderNext(StrTubeReader *this);

#endif