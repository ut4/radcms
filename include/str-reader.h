#ifndef insn_strReader_h
#define insn_strReader_h

#include "memory.h" // ALLOCATE, atoi(stdlib.h), memcpy(string.h), bool

typedef struct {
    char *current;
    char END_OF_VAL; // like a \0, but for values inside the string
} StrReader;

void
strReaderInit(StrReader *this, char *strToRead, char END_OF_VAL);

unsigned
strReaderReadInt(StrReader *this);

char*
strReaderReadStr(StrReader *this);

bool
strReaderIsDigit(char c);

char
strReaderAdvance(StrReader *this);

#endif