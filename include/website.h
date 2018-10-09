#ifndef insn_website_h
#define insn_website_h

#include "memory.h"

struct PageArray;
typedef struct PageArray PageArray;

typedef struct {
    unsigned id;
    unsigned level;
} Page;

typedef struct {
    PageArray *pageGraph;
} Website;

/**
 * Creates a page graph $out from a serialized array $str.
 *
 * @param {char} *str Array to parse
 * @param {unsigned} strLen Number of characters in $str
 * @param {PageArray} *out
 */
bool
pageGraphParse(char *str, unsigned strLen, PageArray *out);

/**
 * Converts $pageGraph to a compact representation $to.
 */
void
pageGraphSerialize(PageArray *pageGraph, char *to);

struct PageArray {
    unsigned capacity;
    unsigned length;
    Page *values;
};
void pageArrayInit(PageArray *this, unsigned capacity);
void pageArrayPush(PageArray *this, Page *page);
void pageArrayDestruct(PageArray *this);

#endif