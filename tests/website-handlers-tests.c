#include "website-handlers-tests.h"

static char *myLog;
static char *logTail;

static int
mockUploadImplFn(UploadState *state, char *renderedHtml, Page *page) {
    unsigned olen = strlen(myLog) + 1;
    myLog = ARRAY_GROW(myLog, char, olen, olen + strlen(renderedHtml)+strlen(page->url));
    logTail = myLog + olen - 1;
    STR_APPEND(logTail, renderedHtml, strlen(renderedHtml));
    STR_APPEND(logTail, page->url, strlen(page->url));
    return UPLOAD_OK;
}

static void
testUploadPageAndWriteRespChunkDoesStuff() {
    #define URL_1 "/"
    #define URL_2 "/foo"
    #define HTML_1 "<first>"
    #define HTML_2 "<second>"
    const unsigned chunkPartsLen = strlen("N\r\n\r\n");
    const unsigned baseChunkLen = chunkPartsLen + strlen(/*url*/"|NNN");
    myLog = ALLOCATE(char);
    myLog[0] = '\0';
    //
    SiteGraph testGraph;
    siteGraphInit(&testGraph);
    siteGraphAddPage(&testGraph, 1, copyString(URL_1), 0, 0);
    siteGraphAddPage(&testGraph, 2, copyString(URL_2), 0, 0);
    StrTube testHtmls = strTubeMake();
    strTubePush(&testHtmls, HTML_1);
    strTubePush(&testHtmls, HTML_2);
    //
    UploadState testState;
    testState.totalIncomingPages = testHtmls.length;
    testState.hadStopError = false;
    StrTubeReader testPagesReader = strTubeReaderMake(&testHtmls);
    testState.renderOutputReader = &testPagesReader;
    testState.uploadImplFn = mockUploadImplFn;
    testState.curPage = testGraph.pages.orderedAccess;
    //
    char buf[32];
    char expectedResponse[baseChunkLen + 6];
    // Simulate the first MHD_create_response_from_callback -call
    testState.nthPage = 1;
    unsigned bytesWritten1 = uploadPageAndWriteRespChunk(&testState, 0, buf, 512);
    unsigned expectedLen1 = baseChunkLen + strlen(URL_1);
    assertIntEqualsOrGoto(bytesWritten1, expectedLen1, done);
    assertStrEquals(myLog, HTML_1 URL_1);
    sprintf(expectedResponse, "%x\r\n%s|%03d\r\n", expectedLen1-chunkPartsLen,
            URL_1, UPLOAD_OK);
    assertStrEquals(buf, expectedResponse);
    // Simulate the second MHD_create_response_from_callback -call
    testState.nthPage = 2;
    unsigned bytesWritten2 = uploadPageAndWriteRespChunk(&testState, 0, buf, 512);
    unsigned expectedLen2 = baseChunkLen + strlen(URL_2);
    assertIntEqualsOrGoto(bytesWritten2, expectedLen2, done);
    assertStrEquals(myLog, HTML_1 URL_1 HTML_2 URL_2);
    sprintf(expectedResponse, "%x\r\n%s|%03d\r\n", expectedLen2-chunkPartsLen,
            URL_2, UPLOAD_OK);
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

void
websiteHandlersTestsRun() {
    testUploadPageAndWriteRespChunkDoesStuff();
}
