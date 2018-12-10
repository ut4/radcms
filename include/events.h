#ifndef insn_events_h
#define insn_events_h

#include "array.h"
#include "memory.h"

typedef bool (*eventListenerFn)(void *arg, void *myPtr);

typedef struct {
    const char *eventName;
    void *myPtr;
    eventListenerFn fn;
} EventListener;

typedef struct {
    unsigned capacity;
    unsigned length;
    EventListener *values;
} EventListenerArray;

typedef struct {
    EventListenerArray listeners;
} Events;

void
eventsInit();

void
eventsFreeProps();

/**
 * Adds $runThisFn to a list of functions listening to event $which.
 */
void
onEvent(const char *which, eventListenerFn runThisFn, void *myPtr);

/**
 * Calls each listener function listening to event $which.
 */
void
emitEvent(const char *which, void *arg);

void eventListenerArrayInit(EventListenerArray *this);
void eventListenerArrayPush(EventListenerArray *this, EventListener value);
void eventListenerArrayFreeProps(EventListenerArray *this);

#endif