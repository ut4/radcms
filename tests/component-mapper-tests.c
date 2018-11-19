#include "component-mapper-tests.h"

static void mapTestDataRow(sqlite3_stmt *stmt, void **myPtr);

static void
testComponentInsertValidatesItsInput(Db *db, char *err) {
    ComponentFormData cfd;
    componentInit(&cfd.cmp);
    cfd.errors = 0;
    int insertId = componentMapperInsertComponent(db, &cfd, err);
    assertThat(insertId == -1, "Should reject the data");
    assertThat(hasError(cfd.errors, CMP_NAME_REQUIRED),
               "Should set CMP_NAME_REQUIRED");
    assertThat(hasError(cfd.errors, CMP_JSON_REQUIRED),
               "Should set CMP_JSON_REQUIRED");
    assertThat(hasError(cfd.errors, CMP_COMPONENT_TYPE_ID_REQUIRED),
               "Should set CMP_COMPONENT_TYPE_ID_REQUIRED");
    componentFreeProps(&cfd.cmp);
}

static void
testComponentInsertInsertsTheData(Db *db, char *err) {
    //
    if (!testUtilsExecSql(db,
        "insert into componentTypes values (1, 'test');"
    )) return;
    //
    ComponentFormData cfd;
    componentInit(&cfd.cmp);
    cfd.errors = 0;
    cfd.cmp.name = copyString("foo");
    cfd.cmp.json = copyString("{\"bar\": 1}");
    cfd.cmp.componentTypeId = 1;
    int insertId = componentMapperInsertComponent(db, &cfd, err);
    Component *actual = NULL;
    assertIntEqualsOrGoto(insertId, 1, done);
    assertThat(cfd.errors == 0, "Shouldn't set any errors");
    bool selectRes = dbSelect(db, "select name,json,componentTypeId FROM components"
        " WHERE id=1", mapTestDataRow, (void*)&actual, err);
    assertThatOrGoto(selectRes, done, "Should insert data");
    assertThatOrGoto(actual != NULL, done, "Sanity actual != NULL");
    assertStrEquals(actual->name, cfd.cmp.name);
    assertStrEquals(actual->json, cfd.cmp.json);
    assertIntEquals(actual->componentTypeId, cfd.cmp.componentTypeId);
    //
    done:
        componentFreeProps(&cfd.cmp);
        if (actual) {
            componentFreeProps(actual);
            FREE(Component, actual);
        }
        testUtilsExecSql(db,
            "delete from components;"
            "delete from componentTypes"
        );
}

void
componentMapperTestsRun() {
    char errBuf[ERR_BUF_LEN]; errBuf[0] = '\0';
    Db db;
    dbInit(&db);
    if (!testUtilsSetupTestDb(&db, errBuf)) {
        dbDestruct(&db);
        return;
    }
    testComponentInsertValidatesItsInput(&db, errBuf);
    testComponentInsertInsertsTheData(&db, errBuf);
    dbDestruct(&db);
}

static void mapTestDataRow(sqlite3_stmt *stmt, void **myPtr) {
    Component *c = ALLOCATE(Component);
    componentInit(c);
    c->name = copyString((const char*)sqlite3_column_text(stmt, 0));
    c->json = copyString((const char*)sqlite3_column_text(stmt, 1));
    c->componentTypeId = (unsigned)sqlite3_column_int(stmt, 2);
    *myPtr = c;
}

