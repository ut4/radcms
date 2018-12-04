#include "component-mapper-tests.h"

static bool mapTestDataRow(sqlite3_stmt *stmt, void *myPtr);

static void
populateComponent(unsigned id, const char *name, const char *json,
                  unsigned componentTypeId, unsigned dbcId, Component *out);

static void
testComponentInsertValidatesItsInput(Db *db, char *err) {
    ComponentFormData cfd;
    componentInit(&cfd.cmp);
    cfd.errors = 0;
    int insertId = componentMapperInsertComponent(db, &cfd, err);
    assertThat(insertId == -1, "Should reject the data");
    assertThat(hasFlag(cfd.errors, CMP_NAME_REQUIRED),
               "Should set CMP_NAME_REQUIRED");
    assertThat(hasFlag(cfd.errors, CMP_JSON_REQUIRED),
               "Should set CMP_JSON_REQUIRED");
    assertThat(hasFlag(cfd.errors, CMP_COMPONENT_TYPE_ID_REQUIRED),
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
        " WHERE id=1", mapTestDataRow, &actual, err);
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

static void
testComponentArrayToJsonStringifiesComponentArray() {
    ComponentArray cmps;
    componentArrayInit(&cmps);
    Component cmp1;
    Component cmp2;
    populateComponent(1, "foo", "[1]", 1, 2, &cmp1);
    populateComponent(1, "bar", "{\"content\":\"(c) 2034 MySite\"}", 3, 4, &cmp2);
    componentArrayPush(&cmps, &cmp1);
    componentArrayPush(&cmps, &cmp2);
    //
    char *json = componentArrayToJson(&cmps);
    assertThatOrGoto(json != NULL, done, "Should return json");
    assertStrEquals(json,
        "[{"
            "\"id\":1,"
            "\"name\":\"foo\","
            "\"json\":\"[1]\","
            "\"componentTypeId\":1,"
            "\"dataBatchConfigId\":2"
        "},{"
            "\"id\":1,"
            "\"name\":\"bar\","
            "\"json\":\"{\\\"content\\\":\\\"(c) 2034 MySite\\\"}\","
            "\"componentTypeId\":3,"
            "\"dataBatchConfigId\":4"
        "}]"
    );
    done:
        free(json);
        componentArrayFreeProps(&cmps);
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
    testComponentArrayToJsonStringifiesComponentArray();
    dbDestruct(&db);
}

static bool mapTestDataRow(sqlite3_stmt *stmt, void *myPtr) {
    Component *c = ALLOCATE(Component);
    componentInit(c);
    c->name = copyString((const char*)sqlite3_column_text(stmt, 0));
    c->json = copyString((const char*)sqlite3_column_text(stmt, 1));
    c->componentTypeId = (unsigned)sqlite3_column_int(stmt, 2);
    *((Component**)myPtr) = c;
    return true;
}

static void
populateComponent(unsigned id, const char *name, const char *json,
                  unsigned componentTypeId, unsigned dbcId, Component *out) {
    componentInit(out);
    out->id = id;
    out->name = copyString(name);
    out->json = copyString(json);
    out->componentTypeId = componentTypeId;
    out->dataBatchConfigId = dbcId;
}
