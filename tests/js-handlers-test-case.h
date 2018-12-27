#ifndef insn_jsHandlersTestCase_h
#define insn_jsHandlersTestCase_h

#include "test-utils.h" // testUtilsSetupTestDb()
#include "../../include/common-script-bindings.h" // commonScriptBindingsInit()

void jsHandlersTestCaseInit(Db *db, duk_context **ctx, char *errBuf);

void jsHandlersTestCaseClean(Db *db, duk_context *ctx);

#endif