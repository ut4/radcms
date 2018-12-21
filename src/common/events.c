#include "../../include/common/events.h"

Events events;

void
eventsInit() {
    eventListenerArrayInit(&events.listeners);
}

void
eventsFreeProps() {
    eventListenerArrayFreeProps(&events.listeners);
}

void
onEvent(const char *which, eventListenerFn runThisFn, void *myPtr) {
    eventListenerArrayPush(&events.listeners, (EventListener){
        .eventName = which,
        .myPtr = myPtr,
        .fn = runThisFn
    });
}

void
emitEvent(const char *which, void *arg) {
    for (unsigned i = 0; i < events.listeners.length; ++i) {
        EventListener *listener = &events.listeners.values[i];
        if (strcmp(listener->eventName, which) == 0 &&
            !listener->fn(arg, listener->myPtr)) break;
    }
}

void eventListenerArrayInit(EventListenerArray *this) {
    arrayInit(EventListener, 0);
}
void eventListenerArrayPush(EventListenerArray *this, EventListener value) {
    arrayPush(EventListener, value);
}
void eventListenerArrayFreeProps(EventListenerArray *this) {
    arrayFreeProps(EventListener);
}
