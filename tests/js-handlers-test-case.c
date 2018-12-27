#include "js-handlers-test-case.h"

void jsHandlersTestCaseInit(Db *db, duk_context **ctx, char *errBuf) {
    errBuf[0] = '\0';
    dbInit(db);
    if (!testUtilsSetupTestDb(db, errBuf)) {
        dbDestruct(db);
        return;
    }
    duk_context *d = myDukCreate(errBuf);
    ASSERT(d != NULL, "Failed to create duk_context");
    commonScriptBindingsInit(d, db, errBuf);
    *ctx = d;
}

void jsHandlersTestCaseClean(Db *db, duk_context *ctx) {
    dbDestruct(db);
    duk_destroy_heap(ctx);
}