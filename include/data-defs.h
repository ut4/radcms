#ifndef insn_dataDefs_h
#define insn_dataDefs_h

#include <cJSON.h>
#include "memory.h"

typedef struct {
    unsigned id;
    char *name;
    char *json;
    unsigned componentTypeId;
    unsigned dataBatchConfigId; // id of the DataBatchConfig that this data belongs to
} Component;

typedef struct  {
    unsigned capacity;
    unsigned length;
    Component *values;
} ComponentArray;

void
componentInit(Component *this);

void
componentFreeProps(Component *this);

char*
componentArrayToJson(ComponentArray *this);

void componentArrayInit(ComponentArray *this);
void componentArrayPush(ComponentArray *this, Component *value);
void componentArrayFreeProps(ComponentArray *this);

#endif