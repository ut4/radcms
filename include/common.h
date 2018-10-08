#ifndef insn_common_h
#define insn_common_h

#include <stdbool.h>

#define ERR_BUF_LEN 512

#define putError(...) \
    snprintf(err, ERR_BUF_LEN, ##__VA_ARGS__)

#define printToStdErr(...) \
    fprintf(stderr, ##__VA_ARGS__)

#endif