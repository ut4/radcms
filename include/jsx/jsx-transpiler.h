#ifndef insn_jsxTranspiler_h
#define insn_jsxTranspiler_h

#include <stdbool.h>

void
transpilerInit();

void
transpilerFreeProps();

char*
transpilerTranspile(const char *code);

char*
transpilerTranspileIsx(const char *code);

char*
transpilerGetLastError();

void
transpilerSetPrintErrors(bool logErrors);

#endif