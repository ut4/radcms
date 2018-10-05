#include <stdio.h>
#if defined(_WIN32) && !defined(__CYGWIN__)
#include <winsock2.h>
#else
#include <sys/select.h>
#endif
#include <microhttpd.h>
#include "include/data-access.h" // DocumentDataConfig, DataBatchConfig
#include "include/generating.h" // generatorGenerate(), WebSite
#include "include/lua.h" // createLuaState()
#include "include/lualib.h" // luaLibLoad()
#include "include/templating.h" // TemplateProvider
#include "include/vtree.h" // vtreeCreate()

char *tempHack;

int mainRequestHandler(
    void *cls,
    struct MHD_Connection *connection,
    const char *url,
    const char *method,
    const char *version,
    const char *uploadData,
    size_t *uploadDataSize,
    void **conCls
) {
    const char *noContent = "<html><body>404</body></html>";
    struct MHD_Response *response;
    unsigned statusCode = MHD_HTTP_OK;
    int ret;
    if (strcmp(method, "GET") == 0) {
        response = MHD_create_response_from_buffer(strlen(tempHack), (void*)tempHack, MHD_RESPMEM_PERSISTENT);
    } else {
        response = MHD_create_response_from_buffer(strlen(noContent), (void*)noContent, MHD_RESPMEM_PERSISTENT);
        statusCode = MHD_HTTP_NOT_FOUND;
    }
    ret = MHD_queue_response(connection, statusCode, response);
    MHD_destroy_response(response);
    return ret;
}

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

int main(int argc, const char* argv[]) {
    char errBuf[512];
    errBuf[0] = '\0';
    /*
     * 1. Validate arguments
     */
    if (argc < 3) {
        fprintf(stderr, "Usage gen.exe path/to/my/workspace main-layout-file.lua\n");
        return EXIT_FAILURE;
        // todo if (!argv[1].endswith('/')) -> validation err
        // todo if (!argv[2].isDir()) -> validation err
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
    tempHack = page.html;
    /*
     * 4. Start the web ui
     */
    struct MHD_Daemon *daemon = MHD_start_daemon(
        MHD_USE_INTERNAL_POLLING_THREAD|MHD_OPTION_STRICT_FOR_CLIENT, 3000,
        NULL, NULL, &mainRequestHandler, NULL, MHD_OPTION_END
    );
    if (daemon) {
        printf("Started server at localhost:3000. Hit Ctrl+C to stop it...\n");
    } else {
        sprintf(errBuf, "Failed to start the server.\n");
        goto fail;
    }
    getchar();
    MHD_stop_daemon(daemon);
    vTreeDestruct(vTree);
    lua_close(L);
    return EXIT_SUCCESS;
    fail:
        fprintf(stderr, errBuf);
        vTreeDestruct(vTree);
        lua_close(L);
        return EXIT_FAILURE;
}
