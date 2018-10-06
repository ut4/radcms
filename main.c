#include <stdio.h>
#include "include/data-access.h" // DocumentDataConfig, DataBatchConfig
#include "include/generating.h" // generatorGenerate(), WebSite
#include "include/lua.h" // createLuaState()
#include "include/lualib.h" // luaLibLoad()
#include "include/templating.h" // TemplateProvider
#include "include/vtree.h" // vtreeCreate()
#include "include/web.h" // global "app" variable, appStart(), appShutdown()

// TODO move this to somewhere else
static bool callLayoutTmplFn(
    lua_State *L,
    VTree *vTree,
    DocumentDataConfig *ddc,
    char *err
) {
    luaPushVTree(L, vTree);                // [fn, userdata]
    luaPushDocumentDataConfig(L, ddc);     // [fn, userdata, userdata]
    if (lua_pcall(L, 2, 0, 0) == LUA_OK) { // []
        return true;
    }
    sprintf(err, getLuaErrorDetails(L));
    return false;
}

static void injectCPanel(char *html) {
    const char *injection = "<iframe src=\"/int/cpanel\"></iframe>";
    char *tmp = ARRAY_GROW(html, char, strlen(html),
                           strlen(html) + strlen(injection) + 1);
    char *startOfBody = strstr(tmp, "<body>");
    if (startOfBody) {
        startOfBody += strlen("<body>");
    } else {
        fprintf(stderr, "Failed to inject the ui-panel into the main layout.");
        ARRAY_FREE(char, tmp, strlen(tmp));
        return;
    }
    size_t injlen = strlen(injection);
    // Appends <html><body>ROOMFORINJECTIONabcd</body>
    memmove(startOfBody + injlen, startOfBody, strlen(startOfBody));
    // Replaces ROOMFORINJECTION
    memmove(startOfBody, injection, injlen);
    html = tmp;
}

int main(int argc, const char* argv[]) {
    char errBuf[512];
    errBuf[0] = '\0';
    /*
     * 1. Validate arguments
     */
    if (argc < 3) {
        fprintf(stderr, "Usage gen.exe path/to/my/workspace/ main-layout-file.lua\n");
        return EXIT_FAILURE;
        // todo if (!argv[1].endswith('/') or isNotDir) -> validation err
        // todo if (!argv[2].isFile()) -> validation err
    }
    /*
     * 2. Initialize the application
     */
    lua_State *L = createLuaState(true);
    if (L) {
        configureLua(L, argv[1]);
        luaLibLoad(L);
    } else {
        fprintf(stderr, "Failed to create lua_State.\n");
        return EXIT_FAILURE;
    }
    TemplateProvider tp;
    templateProviderInit(&tp, L);
    DocumentDataConfig ddc;
    documentDataConfigInit(&ddc);
    VTree *vTree = vTreeCreate();
    /*
     * 3. Generate the main page/layout
     */
    const char *mainLayoutFileName = argv[2];
    if (!templateProviderLoadFnFromFile(&tp, mainLayoutFileName, errBuf)) {
        goto fail;
    }
    if (!callLayoutTmplFn(L, vTree, &ddc, errBuf)) {
        goto fail;
    }
    WebPage page;
    Generator generator;
    generatorInit(&generator, &tp, vTree, &ddc);
    if (!generatorGeneratePage(&generator, &page, "/", errBuf)) {
        goto fail;
    }
    injectCPanel(page.html);
    /*
     * 4. Start the web ui
     */
    appInit(argv[1], page.html);
    if (appStart()) {
        printf("Started server at localhost:3000. Hit Ctrl+C to stop it...\n");
    } else {
        sprintf(errBuf, "Failed to start the server.\n");
        goto fail;
    }
    /*
     * 5. Wait
     */
    getchar();
    appShutdown();
    vTreeDestruct(vTree);
    lua_close(L);
    return EXIT_SUCCESS;
    fail:
        fprintf(stderr, errBuf);
        vTreeDestruct(vTree);
        lua_close(L);
        return EXIT_FAILURE;
}
