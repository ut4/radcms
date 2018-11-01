#ifndef insn_timer_h
#define insn_timer_h

#if defined(_WIN32) && !defined(__CYGWIN__)

#include <windows.h>

#define timerInit() \
    LARGE_INTEGER frequency, start, end; \
    bool timerIsRunning = false; \
    QueryPerformanceFrequency(&frequency)

#define timerStart() \
    QueryPerformanceCounter(&start); \
    timerIsRunning = true

#define timerGetTime() \
    (timerIsRunning ? \
    (QueryPerformanceCounter(&end), \
    (double)(end.QuadPart - start.QuadPart) / frequency.QuadPart) : 0)

#endif

#endif