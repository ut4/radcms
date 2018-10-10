#ifndef insn_testlib_h
#define insn_testlib_h

#include <stdbool.h>
#include <stdio.h>

#define assertThat(what, details) \
    if (!what) fprintf(stderr, "%s at %s line %d\n", details, __FILE__, __LINE__)

#define assertIntEquals(act, exp) \
    if (act != exp) fprintf(stderr, "expected %d but was actually %d at %s line %d\n", \
                            exp, act, __FILE__, __LINE__)

#define assertStrEquals(act, exp) \
    if (strcmp(act, exp) != 0) fprintf(stderr, "expected %s but was actually %s \
                                       at %s line %d\n", exp, act, __FILE__, __LINE__)

#endif