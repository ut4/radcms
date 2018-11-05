#ifndef insn_timer_h
#define insn_timer_h

#if defined(INSN_IS_WIN)

#include <windows.h>

#define timerInit() \
    LARGE_INTEGER frequency, start, end; \
    bool timerIsRunning = false; \
    QueryPerformanceFrequency(&frequency)

#define timerStart() \
    QueryPerformanceCounter(&start); \
    timerIsRunning = true

#define timerGetTime() \
    (timerIsRunning \
        ? QueryPerformanceCounter(&end), \
          (double)(end.QuadPart - start.QuadPart) / frequency.QuadPart \
        : 0)

#elif defined(INSN_IS_LINUX)

#include <time.h>

#define timerInit() \
    struct timespec start, end; \
    bool timerIsRunning = false

#define timerStart() \
    (void)clock_gettime(CLOCK_PROCESS_CPUTIME_ID, &start); \
    timerIsRunning = true

#define timerGetTime() \
    (timerIsRunning \
        ? (void)clock_gettime(CLOCK_PROCESS_CPUTIME_ID, &end), \
          (double)(end.tv_sec - start.tv_sec) * 1000000 + (end.tv_nsec - start.tv_nsec) / 100000 \
        : 0)

#endif

#endif