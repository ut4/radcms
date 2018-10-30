#include "data-query-tests.h"

static void
testDocumentDataConfigAddsBatches() {
    DocumentDataConfig ddc;
    documentDataConfigInit(&ddc);
    DataBatchConfig *dbc1;
    DataBatchConfig *dbc2;
    DataBatchConfig *dbc3;
    //
    dbc1 = documentDataConfigAddBatch(&ddc, "Generic", false);
    assertIntEquals(ddc.batchCount, 1);
    assertThatOrGoto(dbc1 != NULL, done, "Should return the first batch");
    assertThatOrGoto(ddc.batches.componentTypeName != NULL, done,
                     "Should populate the first batch");
    assertStrEquals(ddc.batches.componentTypeName, "Generic");
    assertIntEquals(ddc.batches.id, 1);
    assertThatOrGoto(&ddc.batches == dbc1, done, "&ddc.batches == dbc1");
    assertThatOrGoto(ddc.batchHead == &ddc.batches, done, "ddc.batchHead == &ddc.batches");
    //
    dbc2 = documentDataConfigAddBatch(&ddc, "MyType", false);
    assertIntEquals(ddc.batchCount, 2);
    assertThatOrGoto(dbc2 != NULL, done, "Should return the second batch");
    assertThatOrGoto(ddc.batches.next != NULL, done, "Should add the secondBatch");
    DataBatchConfig *second = ddc.batches.next;
    assertThatOrGoto(second == dbc2, done, "ddc.batches.next == second batch");
    assertThatOrGoto(second->componentTypeName != NULL, done,
                     "Should populate the second batch");
    assertStrEquals(second->componentTypeName, "MyType");
    assertIntEquals(second->id, 2);
    assertThatOrGoto(ddc.batchHead == second, done, "ddc.batchHead == secondBatch");
    //
    dbc3 = documentDataConfigAddBatch(&ddc, "Another", false);
    assertIntEquals(ddc.batchCount, 3);
    assertThatOrGoto(dbc3 != NULL, done, "Should return the third batch");
    assertThatOrGoto(ddc.batches.next->next != NULL, done, "Should add the third batch");
    DataBatchConfig *third = ddc.batches.next->next;
    assertThatOrGoto(third == dbc3, done, "ddc.batches.next->next == thirdBatch");
    assertThatOrGoto(third->componentTypeName != NULL, done,
                     "Should populate the third batch");
    assertStrEquals(third->componentTypeName, "Another");
    assertIntEquals(third->id, 3);
    assertThatOrGoto(ddc.batchHead == third, done, "ddc.batchHead == thirdBatch");
    //
    done:
        documentDataConfigFreeProps(&ddc);
}

static void
testDocumentDataToSqlGeneratesQueryForSingleFetchOne() {
    //
    DocumentDataConfig ddc;
    documentDataConfigInit(&ddc);
    char errBuf[ERR_BUF_LEN]; errBuf[0] = '\0';
    //
    const bool isFetchAll = false;
    DataBatchConfig *dbc = documentDataConfigAddBatch(&ddc, "Generic", isFetchAll);
    dataBatchConfigSetWhere(dbc, "name='Foo'");
    char *sql = documentDataConfigToSql(&ddc, errBuf);
    assertThatOrGoto(sql != NULL, done, "Should return the sql");
    assertStrEquals(sql, "select `id`,`name`,`json`,`dbcId` from ("
        "select * from (select `id`,`name`,`json`,1 as `dbcId` from components where name='Foo')"
    ")");
    //
    done:
        documentDataConfigFreeProps(&ddc);
}

static void
testDocumentDataToSqlGeneratesQueryForMultipleFetchOnes() {
    //
    DocumentDataConfig ddc;
    documentDataConfigInit(&ddc);
    char errBuf[ERR_BUF_LEN]; errBuf[0] = '\0';
    //
    const bool isFetchAll = false;
    DataBatchConfig *dbc1 = documentDataConfigAddBatch(&ddc, "Generic", isFetchAll);
    dataBatchConfigSetWhere(dbc1, "name='Foo'");
    DataBatchConfig *dbc2 = documentDataConfigAddBatch(&ddc, "Generic", isFetchAll);
    dataBatchConfigSetWhere(dbc2, "name='Bar'");
    DataBatchConfig *dbc3 = documentDataConfigAddBatch(&ddc, "Article", isFetchAll);
    dataBatchConfigSetWhere(dbc3, "name='Naz'");
    char *sql = documentDataConfigToSql(&ddc, errBuf);
    assertThatOrGoto(sql != NULL, done, "Should return the sql");
    assertStrEquals(sql, "select `id`,`name`,`json`,`dbcId` from ("
        "select * from (select `id`,`name`,`json`,1 as `dbcId` from components where name='Foo') union all "
        "select * from (select `id`,`name`,`json`,2 as `dbcId` from components where name='Bar') union all "
        "select * from (select `id`,`name`,`json`,3 as `dbcId` from components where name='Naz')"
    ")");
    //
    done:
        documentDataConfigFreeProps(&ddc);
}

static void
testDocumentDataToSqlGeneratesQueryForSingleFetchAll() {
    //
    DocumentDataConfig ddc;
    documentDataConfigInit(&ddc);
    char errBuf[ERR_BUF_LEN]; errBuf[0] = '\0';
    //
    const bool isFetchAll = true;
    documentDataConfigAddBatch(&ddc, "Article", isFetchAll);
    char *sql = documentDataConfigToSql(&ddc, errBuf);
    assertThatOrGoto(sql != NULL, done, "Should return the sql");
    assertStrEquals(sql, "select `id`,`name`,`json`,`dbcId` from ("
        "select * from ("
            "select `id`,`name`,`json`,1 as `dbcId` from components where "
            "`componentTypeId` = (select `id` from componentTypes where `name` "
            "= 'Article')"
        ")"\
    ")");
    //
    done:
        documentDataConfigFreeProps(&ddc);
}

static void
testDocumentDataToSqlGeneratesQueryForMultipleFetchAlls() {
    //
    DocumentDataConfig ddc;
    documentDataConfigInit(&ddc);
    char errBuf[ERR_BUF_LEN]; errBuf[0] = '\0';
    //
    const bool isFetchAll = true;
    documentDataConfigAddBatch(&ddc, "Article", isFetchAll);
    documentDataConfigAddBatch(&ddc, "Other", isFetchAll);
    char *sql = documentDataConfigToSql(&ddc, errBuf);
    assertThatOrGoto(sql != NULL, done, "Should return the sql");
    assertStrEquals(sql, "select `id`,`name`,`json`,`dbcId` from ("
        "select * from ("
            "select `id`,`name`,`json`,1 as `dbcId` from components where "
            "`componentTypeId` = (select `id` from componentTypes where `name` "
            "= 'Article')"
        ") union all "
        "select * from ("
            "select `id`,`name`,`json`,2 as `dbcId` from components where "
            "`componentTypeId` = (select `id` from componentTypes where `name` "
            "= 'Other')"
        ")"
    ")");
    //
    done:
        documentDataConfigFreeProps(&ddc);
}

void
dataQueryTestsRun() {
    testDocumentDataConfigAddsBatches();
    testDocumentDataToSqlGeneratesQueryForSingleFetchOne();
    testDocumentDataToSqlGeneratesQueryForMultipleFetchOnes();
    testDocumentDataToSqlGeneratesQueryForSingleFetchAll();
    testDocumentDataToSqlGeneratesQueryForMultipleFetchAlls();
}
