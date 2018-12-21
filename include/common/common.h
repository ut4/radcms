#ifndef insn_common_h
#define insn_common_h

#include <stdbool.h>
#include <stdio.h>

#define ERR_BUF_LEN 512

#define putError(...) \
    snprintf(err, ERR_BUF_LEN, ##__VA_ARGS__)

#define printToStdErr(...) \
    fprintf(stderr, ##__VA_ARGS__)

#define setFlag(errors, error) errors |= (error)
#define hasFlag(errors, error) (errors & (error))

#ifdef NDEBUG
#define ASSERT(that, ...) ;
#else
#define ASSERT(that, ...) \
    if (!(that)) { \
        fprintf(stderr, ## __VA_ARGS__); \
        exit(EXIT_FAILURE); \
    }
#endif

#endif