#include <stdio.h>
#if defined(_WIN32) && !defined(__CYGWIN__)
#include <winsock2.h>
#else
#include <sys/select.h>
#endif
#include <microhttpd.h>
#include "include/data-access.h" // DocumentDataConfig, DataBatchConfig
#include "include/lua.h" // createLuaState() etc.
#include "include/lualib.h" // luaLibLoad()
#include "include/templating.h" // TemplateProvider etc.
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
    pushVTree(L, vTree);                     // [fn, userdata]
    pushDocumentDataConfig(L, ddc);          // [fn, userdata, userdata]
    int r = lua_pcall(L, 2, 0, 0);
    if (r != LUA_OK) {                       // []
        sprintf(err, lua_tostring(L, -1));
        return false;
    }
    return true;
}
int main(int argc, const char* argv[]) {
    char errBuf[512];
    errBuf[0] = '\0';
    // 1. Validate arguments
    if (argc < 3) {
        fprintf(stderr, "Usage gen.exe path/to/my/workspace main-layout-file.lua\n");
        return EXIT_FAILURE;
        // todo if (!argv[1].endswith('/')) -> validation err
        // todo if (!argv[2].isDir()) -> validation err
    }
    // 2. Initialize the application
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
    const char *mainLayoutFileName = argv[2];
    DocumentDataConfig ddc;
    documentDataConfigInit(&ddc);
    VTree *vTree = vTreeCreate();
    if (templateProviderLoadLayout(&tp, mainLayoutFileName, errBuf)) {
        if (callLayoutTmplFn(L, vTree, &ddc, errBuf)) {
            tempHack = vTreeToHtml(vTree);
        } else {
            fprintf(stderr, errBuf);
            documentDataConfigDestruct(&ddc);
            vTreeDestruct(vTree);
            lua_close(L);
            return EXIT_FAILURE;
        }
    } else {
        fprintf(stderr, errBuf);
        documentDataConfigDestruct(&ddc);
        vTreeDestruct(vTree);
        lua_close(L);
        return EXIT_FAILURE;
    }
    //
    struct MHD_Daemon *daemon = MHD_start_daemon(
        MHD_USE_INTERNAL_POLLING_THREAD|MHD_OPTION_STRICT_FOR_CLIENT, 3000,
        NULL, NULL, &mainRequestHandler, NULL, MHD_OPTION_END
    );
    if (daemon == NULL) {
        fprintf(stderr, "Failed to start the server.\n");
        documentDataConfigDestruct(&ddc);
        vTreeDestruct(vTree);
        lua_close(L);
        return EXIT_FAILURE;
    } else {
        printf("Started server at localhost:3000. Hit Ctrl+C to stop it...\n");
    }
    getchar();
    MHD_stop_daemon(daemon);
    documentDataConfigDestruct(&ddc);
    vTreeDestruct(vTree);
    lua_close(L);
    return EXIT_SUCCESS;
}
