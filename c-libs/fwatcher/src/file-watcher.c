#include "../include/file-watcher.h"

#ifdef INSN_IS_WIN
#include "file-watcher-win-impl.c"
#elif defined(INSN_IS_LINUX)
#include "file-watcher-linux-impl.c"
#endif
