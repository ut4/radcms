#include <iostream>
#include "include/core-handlers.hpp"
#include "include/web-app.hpp"
#include "include/js-environment.hpp"

static void
myAtExit() {
    std::cout << "[Info]: Application exited cleanly.\n";
}

int
main() {
    atexit(myAtExit);
    AppEnv appEnv;
    WebApp webApp;
    int out = EXIT_FAILURE;
    if (!appEnv.init(INSN_PATH)) goto done;
    webApp.env = &appEnv;
    jsEnvironmentConfigure(appEnv.dukCtx, &appEnv);
    if (!dukUtilsCompileAndRunStrGlobal(appEnv.dukCtx, "require('main.js')",
                                        "main.js", appEnv.errBuf)) {
        goto done;
    }
    webApp.handlers[0] = {coreHandlersHandleStaticFileRequest, &appEnv, nullptr};
    webApp.handlers[1] = {coreHandlersHandleScriptRouteRequest, appEnv.dukCtx,
                          coreHandlersGetScriptRoutePostDataHandlers(appEnv.dukCtx)};
    if (webApp.run()) {
        out = EXIT_SUCCESS;
    }
    done:
    if (out != EXIT_SUCCESS) {
        std::cerr << "[Fatal]: " << appEnv.errBuf << "\n";
        return EXIT_FAILURE;
    }
    return out;
}
