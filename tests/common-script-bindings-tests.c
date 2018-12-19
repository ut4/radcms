#include "common-script-bindings-tests.h"

static void
testAppAddRouteAddsFunctions(duk_context *ctx, char *err) {
    duk_push_global_stash(ctx);
    char *testScript = "function(app) {"
        "app.addRoute(function() { return 11; });"
        "app.addRoute(function() { return 22; });"
    "}";
    if (!dukUtilsCompileStrToFn(ctx, testScript, "l", err)) {  // [stash err]
        printToStdErr("Failed to compile test script: %s", err); goto done; }
    commonScriptBindingsPushApp(ctx, -2);    // [stash fn app]
    if (duk_pcall(ctx, 1) != DUK_EXEC_SUCCESS) { // [stash undef|err]
        printToStdErr("Failed to exec test code.\n"); goto done; }
    duk_pop(ctx); // [stash]
    commonScriptBindingsPushApp(ctx, -1);    // [stash app]
    duk_get_prop_string(ctx, -1, "_routes"); // [stash app routes]
    assertIntEqualsOrGoto((int)duk_get_length(ctx, -1), 2, done);
    duk_get_prop_index(ctx, -1, 1);          // [stash app routes hndlr2]
    duk_get_prop_index(ctx, -2, 0);          // [stash app routes hndlr2 hndlr1]
    assertThatOrGoto(duk_is_function(ctx, -1), done, "Should add 1st func");
    assertThatOrGoto(duk_is_function(ctx, -2), done, "Should add 2nd func");
    duk_call(ctx, 0);                        // [stash app routes hndlr2 ret1]
    assertIntEqualsOrGoto(duk_get_int(ctx, -1), 11, done);
    duk_pop(ctx);                            // [stash app routes hndlr2]
    duk_call(ctx, 0);                        // [stash app routes ret2]
    assertIntEqualsOrGoto(duk_get_int(ctx, -1), 22, done);
    done:
        duk_set_top(ctx, 0);
}

static void
testDbSelectAllBindingsSelectsStuffFromDb(Db *db, duk_context *ctx, char *err) {
    //
    if (!testUtilsExecSql(db,
        "insert into componentTypes values (1, 'test'), (2, 'another');"
    )) return;
    //
    duk_push_global_stash(ctx);
    char *myScript = "function(db) { var out=[];"
                        "db.selectAll('select id, `name` from componentTypes',"
                        "function map(row) {"
                            "out.push({"
                                "id: row.getInt(0), "
                                "name: row.getString(1)"
                            "});"
                        "});"
                        "return out;"
                        "}";
    if (!dukUtilsCompileStrToFn(ctx, myScript, "l", err)) {  // [stash err]
        printToStdErr("Failed to compile test script: %s", err); goto done; }
    commonScriptBindingsPushDb(ctx, -2);                     // [stash fn obj]
    if (duk_pcall(ctx, 1) != DUK_EXEC_SUCCESS) {             // [stash arr|err]
        printToStdErr("Failed to exec test code.\n"); goto done; }
    //
    unsigned outLen = duk_get_length(ctx, -1);
    assertIntEqualsOrGoto(outLen, 2, done);
    duk_get_prop_index(ctx, -1, 0);                          // [stash arr obj]
    assertThatOrGoto(duk_get_prop_string(ctx, -1, "id"),     // [stash arr obj int]
                     done, "1st row should contain .id");
    assertIntEquals(duk_get_int(ctx, -1), 1);
    assertThatOrGoto(duk_get_prop_string(ctx, -2, "name"),   // [stash arr obj int str]
                     done, "1st row should contain .name");
    assertStrEquals(duk_get_string(ctx, -1), "test");
    duk_pop_n(ctx, 3);                                       // [stash arr]
    duk_get_prop_index(ctx, -1, 1);                          // [stash arr obj]
    assertThatOrGoto(duk_get_prop_string(ctx, -1, "id"),     // [stash arr obj int]
                     done, "2nd row should contain .id");
    assertIntEquals(duk_get_int(ctx, -1), 2);
    assertThatOrGoto(duk_get_prop_string(ctx, -2, "name"),   // [stash arr obj int str]
                     done, "2nd row should contain .name");
    assertStrEquals(duk_get_string(ctx, -1), "another");
    //
    done:
        duk_set_top(ctx, 0); // []
        testUtilsExecSql(db,
            "delete from componentTypes"
        );
}

static void
testDbSelectAllBindingsHandlesErrors(Db *db, duk_context *ctx, char *err) {
    //
    if (!testUtilsExecSql(db,
        "insert into componentTypes values (1, 'test');"
    )) return;
    duk_push_global_stash(ctx);
    //
    char *scriptError = "function(db) {"
                        "db.selectAll('select id, `name` from"
                        " componentTypes where id = 1', function map(row) {"
                            "row.bar()"
                        "});"
                        "}";
    if (!dukUtilsCompileStrToFn(ctx, scriptError, "l", err)) { // [stash err]
        printToStdErr("Failed to compile test script: %s", err); goto done; }
    commonScriptBindingsPushDb(ctx, -2);                       // [stash fn obj]
    int success1 = duk_pcall(ctx, 1);                          // [stash arr|err]
    assertThatOrGoto(success1 != DUK_EXEC_SUCCESS, done, "Should fail");
    assertStrEquals(duk_safe_to_string(ctx, -1), "Error: TypeError: undefined"
        " not callable (property 'bar' of [object Object])");
    duk_pop(ctx);
    //
    char *sqlError = "function(db) {"
                        "db.selectAll('select foo', function map(row) {});"
                     "}";
    if (!dukUtilsCompileStrToFn(ctx, sqlError, "l", err)) {    // [stash err]
        printToStdErr("Failed to compile test script: %s", err); goto done; }
    commonScriptBindingsPushDb(ctx, -2);                       // [stash fn obj]
    int success2 = duk_pcall(ctx, 1);                          // [stash arr|err]
    assertThatOrGoto(success2 != DUK_EXEC_SUCCESS, done, "Should fail");
    assertStrEquals(duk_safe_to_string(ctx, -1), "Error: Failed to create stmt"
        ": no such column: foo\n");
    //
    done:
        duk_set_top(ctx, 0); // []
        testUtilsExecSql(db,
            "delete from componentTypes"
        );
}

void
commonScriptBindingsTestsRun() {
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
    ASSERT(ctx != NULL, "Failed to create duk_context\n");
    commonScriptBindingsInit(ctx, &db, NULL, errBuf);
    ASSERT(strlen(errBuf) == 0, "%s", errBuf);
    /*
     * The tests
     */
    testAppAddRouteAddsFunctions(ctx, errBuf);
    testDbSelectAllBindingsSelectsStuffFromDb(&db, ctx, errBuf);
    testDbSelectAllBindingsHandlesErrors(&db, ctx, errBuf);
    /*
     * After
     */
    dbDestruct(&db);
    duk_destroy_heap(ctx);
}

#undef beforeEach
