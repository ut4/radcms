#ifndef insn_dataDefs_h
#define insn_dataDefs_h

#include "memory.h"

typedef struct {
    unsigned id;
    char *name;
    char *json;
    unsigned dataBatchConfigId; // id of the DataBatchConfig that this data belongs to
} Component;

void
componentInit(Component *this);

void
componentFreeProps(Component *this);

#endif