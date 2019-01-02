#pragma once

#include <cstring>
#include <iostream>

#define assertThat(what, details) \
    if (!(what)) std::cerr << details << " at " << __FILE__ << " line " << __LINE__ << "\n"

#define assertThatOrReturn(what, details) \
    if (!(what)) { \
        std::cerr << details << " at " << __FILE__ << " line " << __LINE__ << \
                    "\n" << "returning...\n"; \
        return; \
    }

#define assertThatOrGoto(what, goWhere, details) \
    if (!(what)) { \
        std::cerr << details << " at " << __FILE__ << " line " << __LINE__ << \
                    "\njumping to goto label...\n"; \
        goto goWhere; \
    }

#define assertIntEquals(act, exp) \
    if (act != exp) std::cerr << "expected " << exp << " but was actually " << \
                        act << " at " << __FILE__ << " line " << __LINE__ << "\n"

#define assertIntEqualsOrReturn(act, exp) \
    if (act != exp) { \
        std::cerr << "expected " << exp << " but was actually " <<  act << \
                     " at " << __FILE__ << " line " << __LINE__ << "\n" \
                     "returning...\n"; \
        return; \
    }

#define assertIntEqualsOrGoto(act, exp, goWhere) \
    if (act != exp) { \
        std::cerr << "expected " << exp << " but was actually " <<  act << \
                     " at " << __FILE__ << " line " << __LINE__ << \
                     "\njumping to goto label...\n"; \
        goto goWhere; \
    }

#define assertStrEquals(act, exp) \
    if (strcmp(act, exp) != 0) { \
        std::cerr << "expected \"" << exp << "\" but was actually \"" << act \
                    << "\" at " << __FILE__ << " line " << __LINE__ << "\n"; \
    }
