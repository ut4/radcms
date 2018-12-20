#include "website-handlers-tests.h"

static char *myLog;

static int
mockUploadImplFn(UploadState *state, char *renderedHtml, Page *page) {
    unsigned olen = strlen(myLog) + 1;
    myLog = ARRAY_GROW(myLog, char, olen, olen + strlen(renderedHtml)+strlen(page->url));
    char *logTail = myLog + olen - 1;
    STR_APPEND(logTail, renderedHtml, strlen(renderedHtml));
    STR_APPEND(logTail, page->url, strlen(page->url));
    *logTail = '\0';
    return UPLOAD_OK;
}

static void
testUploadPageAndWriteRespChunkDoesStuff() {
    #define URL_1 "/"
    #define URL_2 "/foo"
    #define URL_3 "/toolong"
    #define HTML_1 "<first>"
    #define HTML_2 "<second>"
    #define HTML_3 "<third>"
    const unsigned chunkPartsLen = strlen("N\r\n\r\n");
    const unsigned baseChunkLen = chunkPartsLen + strlen(/*url*/"|NNN");
    const unsigned maxChunkLen = strlen("NN") + baseChunkLen + 6;
    myLog = ALLOCATE(char);
    myLog[0] = '\0';
    //
    SiteGraph testGraph;
    siteGraphInit(&testGraph);
    siteGraphAddPage(&testGraph, 1, copyString(URL_1), 0, 0);
    siteGraphAddPage(&testGraph, 2, copyString(URL_2), 0, 0);
    siteGraphAddPage(&testGraph, 3, copyString(URL_3), 0, 0);
    StrTube testHtmls = strTubeMake();
    strTubePush(&testHtmls, HTML_1);
    strTubePush(&testHtmls, HTML_2);
    strTubePush(&testHtmls, HTML_3);
    //
    UploadState testState;
    testState.totalIncomingPages = testHtmls.length;
    testState.hadStopError = false;
    StrTubeReader testPagesReader = strTubeReaderMake(&testHtmls);
    testState.renderOutputReader = &testPagesReader;
    testState.uploadImplFn = mockUploadImplFn;
    testState.curPage = testGraph.pages.orderedAccess;
    //
    char buf[48];
    char expectedResponse[baseChunkLen + 6];
    // Simulate the first MHD_create_response_from_callback -call
    testState.nthPage = 1;
    unsigned bytesWritten1 = uploadPageAndWriteRespChunk(&testState, 0, buf,
                                                         maxChunkLen);
    unsigned expectedLen1 = baseChunkLen + strlen(URL_1);
    assertIntEqualsOrGoto(bytesWritten1, expectedLen1, done);
    assertStrEquals(myLog, HTML_1 URL_1);
    sprintf(expectedResponse, "%x\r\n%s|%03d\r\n", expectedLen1-chunkPartsLen,
            URL_1, UPLOAD_OK);
    assertStrEquals(buf, expectedResponse);
    // Second MHD_create_response_from_callback -call
    testState.nthPage = 2;
    unsigned bytesWritten2 = uploadPageAndWriteRespChunk(&testState, 0, buf,
                                                         maxChunkLen);
    unsigned expectedLen2 = baseChunkLen + strlen(URL_2);
    assertIntEqualsOrGoto(bytesWritten2, expectedLen2, done);
    assertStrEquals(myLog, HTML_1 URL_1 HTML_2 URL_2);
    sprintf(expectedResponse, "%x\r\n%s|%03d\r\n", expectedLen2-chunkPartsLen,
            URL_2, UPLOAD_OK);
    assertStrEquals(buf, expectedResponse);
    // Third MHD_create_response_from_callback -call
    testState.nthPage = 3;
    unsigned bytesWritten3 = uploadPageAndWriteRespChunk(&testState, 0, buf,
                                                         maxChunkLen);
    unsigned expectedLen3 = baseChunkLen + 6;
    assertIntEqualsOrGoto(bytesWritten3, expectedLen3, done);
    assertStrEquals(myLog, HTML_1 URL_1 HTML_2 URL_2 HTML_3 URL_3);
    sprintf(expectedResponse, "%x\r\n%s|%03d\r\n", expectedLen3-chunkPartsLen,
            "/toolo", UPLOAD_OK);
    assertStrEquals(buf, expectedResponse);
    //
    done:
        FREE_STR(myLog);
        strTubeFreeProps(&testHtmls);
        siteGraphFreeProps(&testGraph);
    #undef URL_1
    #undef URL_2
    #undef HTML_1
    #undef HTML_2
}

static void
testValidateUploadFormDataReturnsErrorsAndNormalizesData() {
    UploadFormData data = {NULL, NULL, NULL};
    char *errors = validateUploadFormData(&data);
    assertThatOrGoto(errors != NULL, done, "Should return errors");
    assertStrEquals(errors, "FPS remote url is required,"
                            "Username is required," "Password is required");
    //
    UploadFormData needNormalization = {copyString("no/trailing/slash"), "uname", "pass"};
    char *errors2 = validateUploadFormData(&needNormalization);
    assertThat(errors2 == NULL, "Shouldn't return errors");
    assertStrEquals(needNormalization.remoteUrl, "no/trailing/slash/");
    done:
        free(errors);
        FREE_STR(needNormalization.remoteUrl);
}

void
websiteHandlersTestsRun() {
    testUploadPageAndWriteRespChunkDoesStuff();
    testValidateUploadFormDataReturnsErrorsAndNormalizesData();
}
