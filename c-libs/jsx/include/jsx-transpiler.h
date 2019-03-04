#ifndef insn_jsxTranspiler_h
#define insn_jsxTranspiler_h

#include <stdbool.h>

void
transpilerInit();

void
transpilerFreeProps();

char*
transpilerTranspileDuk(const char *src);

char*
transpilerTranspile(const char *src);

char*
transpilerGetLastError();

void
transpilerSetPrintErrors(bool logErrors);

bool
transpilerIsVoidElement(const char *tagName, unsigned tagNameLen);

#endif