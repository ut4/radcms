#include "common-script-bindings-tests.h"

static void
testDbSelectAllBindingsSelectsStuffFromDb(Db *db, duk_context *ctx, char *err) {
    //
    if (!testUtilsExecSql(db,
        "insert into componentTypes values (1, 'test'), (2, 'another');"
    )) return;
    //
    duk_push_thread_stash(ctx, ctx);
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
    commonScriptBindingsPushDbSingleton(ctx, -2);            // [stash fn obj]
    if (duk_pcall(ctx, 1) != 0) {                            // [stash arr|err]
        printToStdErr("Failed to exec test code.\n"); goto done; }
    //
    unsigned outLen = duk_get_length(ctx, -1);
    assertIntEqualsOrGoto(outLen, 2, done);
    duk_get_prop_index(ctx, -1, 0);                          // [stash arr obj]
    assertThatOrGoto(duk_get_prop_string(ctx, -1, "id"),     // [stash arr obj int]
                     done, "1st row should contain .id");
    assertIntEquals(duk_to_int(ctx, -1), 1);
    assertThatOrGoto(duk_get_prop_string(ctx, -2, "name"),   // [stash arr obj int str]
                     done, "1st row should contain .name");
    assertStrEquals(duk_to_string(ctx, -1), "test");
    duk_pop_n(ctx, 3);                                       // [stash arr]
    duk_get_prop_index(ctx, -1, 1);                          // [stash arr obj]
    assertThatOrGoto(duk_get_prop_string(ctx, -1, "id"),     // [stash arr obj int]
                     done, "2nd row should contain .id");
    assertIntEquals(duk_to_int(ctx, -1), 2);
    assertThatOrGoto(duk_get_prop_string(ctx, -2, "name"),   // [stash arr obj int str]
                     done, "2nd row should contain .name");
    assertStrEquals(duk_to_string(ctx, -1), "another");
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
    duk_push_thread_stash(ctx, ctx);
    //
    char *scriptError = "function(db) {"
                        "db.selectAll('select id, `name` from"
                        " componentTypes where id = 1', function map(row) {"
                            "row.bar()"
                        "});"
                        "}";
    if (!dukUtilsCompileStrToFn(ctx, scriptError, "l", err)) { // [stash err]
        printToStdErr("Failed to compile test script: %s", err); goto done; }
    commonScriptBindingsPushDbSingleton(ctx, -2);              // [stash fn obj]
    int success1 = duk_pcall(ctx, 1);                          // [stash arr|err]
    assertThatOrGoto(success1 != 0, done, "Should fail");
    assertStrEquals(duk_safe_to_string(ctx, -1), "Error: TypeError: undefined"
        " not callable (property 'bar' of [object Object])");
    duk_pop(ctx);
    //
    char *sqlError = "function(db) {"
                        "db.selectAll('select foo', function map(row) {});"
                     "}";
    if (!dukUtilsCompileStrToFn(ctx, sqlError, "l", err)) {    // [stash err]
        printToStdErr("Failed to compile test script: %s", err); goto done; }
    commonScriptBindingsPushDbSingleton(ctx, -2);              // [stash fn obj]
    int success2 = duk_pcall(ctx, 1);                          // [stash arr|err]
    assertThatOrGoto(success2 != 0, done, "Should fail");
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
    char errBuf[ERR_BUF_LEN]; errBuf[0] = '\0';
    Db db;
    dbInit(&db);
    if (!testUtilsSetupTestDb(&db, errBuf)) {
        dbDestruct(&db);
        return;
    }
    duk_context *ctx = myDukCreate(errBuf);
    ASSERT(ctx != NULL, "Failed to create duk_context\n");
    commonScriptBindingsRegister(ctx, &db, errBuf);
    ASSERT(strlen(errBuf) == 0, "%s", errBuf);
    //
    testDbSelectAllBindingsSelectsStuffFromDb(&db, ctx, errBuf);
    testDbSelectAllBindingsHandlesErrors(&db, ctx, errBuf);
    //
    dbDestruct(&db);
    duk_destroy_heap(ctx);
}

#undef beforeEach
