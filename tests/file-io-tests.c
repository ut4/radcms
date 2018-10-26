#include "file-io-tests.h"

static void
testFileIOGetNormalizedPathNormalizesThePath() {
    const unsigned l = 4;
    const char* inputs[] =   {"c:\\a\\b", "a\\b", "a/b",  "a/b/"};
    const char* expected[] = {"c:/a/b/",  "a/b/", "a/b/", "a/b/"};
    for (unsigned i = 0; i < l; ++i) {
        char *out = fileIOGetNormalizedPath(inputs[i]);
        assertStrEquals(out, expected[i]);
        FREE_STR(out);
    }
}

void
fileIOTestsRun() {
    testFileIOGetNormalizedPathNormalizesThePath();
}
