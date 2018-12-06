#include "component-handlers-tests.h"

static void
testGETComponentTypesReturnsComponentTypes(Db *db, duk_context *ctx, char *err) {
    if (!testUtilsExecSql(db,
        "insert into componentTypes values (1,'Card');"
        "insert into componentTypeProps values (1,'caption','text',1),(2,'img-src','img',1);"
        "insert into componentTypes values (2,'Generic');"
        "insert into componentTypeProps values (3,'content','richtext',2);"
    )) return;
    //
    char *cwd = testUtilsGetNormalizedCwd();
    if (!testUtilsReadAndRunGlobal(ctx, cwd, "src/web/component-handlers.mod.js",
                                   err)) { printToStdErr("%s",err); return; }
    duk_push_thread_stash(ctx, ctx);         // [stash]
    commonScriptBindingsPushApp(ctx, -1);    // [stash app]
    duk_get_prop_string(ctx, -1, "_routes"); // [stash app routes]
    assertThatOrGoto(duk_get_length(ctx, -1) == 1, done, "Sanity routes.length == 1");
    duk_get_prop_index(ctx, -1, 0);          // [stash app routes routefn]
    //
    duk_push_string(ctx, "GET");
    duk_push_string(ctx, "/api/component-type");
    int res = duk_pcall(ctx, 2);             // [stash app routes fn|err]
    assertThatOrGoto(res == DUK_EXEC_SUCCESS, done, "Matcher should return succesfully");
    assertThatOrGoto(duk_is_function(ctx, -1), done, "Matcher should return a function");
    int res2 = duk_pcall(ctx, 0);            // [stash app routes response]
    assertThatOrGoto(res2 == DUK_EXEC_SUCCESS, done, "Handler should return succesfully");
    duk_get_prop_string(ctx, -1, "body");    // [stash app routes response respbody]
    assertStrEquals(duk_safe_to_string(ctx, -1), "["
        "{\"id\":1,\"name\":\"Card\",\"props\":["
            "{\"id\":1,\"name\":\"caption\",\"contentType\":\"text\",\"cmpTypeId\":1},"
            "{\"id\":2,\"name\":\"img-src\",\"contentType\":\"img\",\"cmpTypeId\":1}"
        "]},{\"id\":2,\"name\":\"Generic\",\"props\":["
            "{\"id\":3,\"name\":\"content\",\"contentType\":\"richtext\",\"cmpTypeId\":2}"
        "]}"
    "]");
    //
    done:
        if (cwd) FREE_STR(cwd);
        duk_set_top(ctx, 0);
        testUtilsExecSql(db,
            "delete from componentTypeProps;"
            "delete from componentTypes;"
        );
}

void
componentHandlersTestsRun() {
    /*
     * Before
     */
    char errBuf[ERR_BUF_LEN]; errBuf[0] = '\0';
    Db db;
    dbInit(&db);
    if (!testUtilsSetupTestDb(&db, errBuf)) {
        dbDestruct(&db);
        return;
    }
    duk_context *ctx = myDukCreate(errBuf);
    ASSERT(ctx != NULL, "Failed to create duk_context");
    commonScriptBindingsInit(ctx, &db, errBuf);
    /*
     * The tests
     */
    testGETComponentTypesReturnsComponentTypes(&db, ctx, errBuf);
    /*
     * After
     */
    dbDestruct(&db);
    duk_destroy_heap(ctx);
}
