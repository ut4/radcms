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
        documentDataConfigDestruct(&ddc);
}

static void
testDocumentDataToSqlGeneratesQueryForSingleRenderOne() {
    //
    DocumentDataConfig ddc;
    documentDataConfigInit(&ddc);
    char errBuf[ERR_BUF_LEN]; errBuf[0] = '\0';
    //
    DataBatchConfig *dbc = documentDataConfigAddBatch(&ddc, "Generic", false);
    dataBatchConfigSetWhere(dbc, "name=\"Foo\"");
    char *sql = documentDataConfigToSql(&ddc, errBuf);
    assertThatOrGoto(sql != NULL, done, "Should return the sql");
    assertStrEquals(sql, "select `id`,`name`,`json` from ("
        "select * from (select `id`,`name`,`json` from components where name=\"Foo\")"
    ")");
    //
    done:
        documentDataConfigDestruct(&ddc);
}

static void
testDocumentDataToSqlGeneratesQueryForMultipleRenderOnes() {
    //
    DocumentDataConfig ddc;
    documentDataConfigInit(&ddc);
    char errBuf[ERR_BUF_LEN]; errBuf[0] = '\0';
    //
    DataBatchConfig *dbc1 = documentDataConfigAddBatch(&ddc, "Generic", false);
    dataBatchConfigSetWhere(dbc1, "name=\"Foo\"");
    DataBatchConfig *dbc2 = documentDataConfigAddBatch(&ddc, "Generic", false);
    dataBatchConfigSetWhere(dbc2, "name=\"Bar\"");
    DataBatchConfig *dbc3 = documentDataConfigAddBatch(&ddc, "Article", false);
    dataBatchConfigSetWhere(dbc3, "name=\"Naz\"");
    char *sql = documentDataConfigToSql(&ddc, errBuf);
    assertThatOrGoto(sql != NULL, done, "Should return the sql");
    assertStrEquals(sql, "select `id`,`name`,`json` from ("
        "select * from (select `id`,`name`,`json` from components where name=\"Foo\") union all "
        "select * from (select `id`,`name`,`json` from components where name=\"Bar\") union all "
        "select * from (select `id`,`name`,`json` from components where name=\"Naz\")"
    ")");
    //
    done:
        documentDataConfigDestruct(&ddc);
}

void
dataQueryTestsRun() {
    testDocumentDataConfigAddsBatches();
    testDocumentDataToSqlGeneratesQueryForSingleRenderOne();
    testDocumentDataToSqlGeneratesQueryForMultipleRenderOnes();
}
