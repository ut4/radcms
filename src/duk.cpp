#include "../include/duk.hpp"

static duk_ret_t
myPrint(duk_context *ctx);

static void
myDukHandleFatalErr(void *udata, const char *msg);

duk_context*
myDukCreate(std::string &errBuf) {
    duk_context *out = duk_create_heap(
        nullptr, // alloc, use default
        nullptr, // realloc, use default
        nullptr, // free, use default
        static_cast<void*>(&errBuf), // myPtr to myDukHandleFatalErr
        myDukHandleFatalErr
    );
    if (!out) return nullptr;
    duk_module_duktape_init(out);
    duk_push_c_lightfunc(out, myPrint, DUK_VARARGS, 0, 0);
    duk_put_global_string(out, "print");
    duk_push_bare_object(out);
    duk_get_global_string(out, "print");
    duk_put_prop_string(out, -2, "log");
    duk_put_global_string(out, "console");
    return out;
}

bool
dukUtilsCompileStrToFn(duk_context *ctx, const char *code, const char *fileName,
                       std::string &err) {
    duk_pcompile_string(ctx, DUK_COMPILE_FUNCTION, code); // fn|err
    if (!duk_is_function(ctx, -1)) {
        dukUtilsPutDetailedError(ctx, -1, fileName, err);
        return false;
    }
    return true;
}

bool
dukUtilsCompileAndRunStrGlobal(duk_context *ctx, const char *code,
                               const char *fileName, std::string &err) {
    duk_push_string(ctx, fileName);
    if (duk_pcompile_string_filename(ctx, DUK_COMPILE_STRICT, code) != DUK_EXEC_SUCCESS ||
        duk_pcall(ctx, 0) != DUK_EXEC_SUCCESS) {
        dukUtilsPutDetailedError(ctx, -1, fileName, err);
        return false;
    }
    duk_pop(ctx);
    return true;
}

void
dukUtilsDumpStack(duk_context *ctx) {
    int l = duk_get_top(ctx);
    for (int i = 0; i < l; ++i) {
        std::cout << i << ": ";
        switch (duk_get_type(ctx, i)) {
            case DUK_TYPE_UNDEFINED:
                std::cout << "undefined";
                break;
            case DUK_TYPE_NULL:
                std::cout << "null";
                break;
            case DUK_TYPE_BOOLEAN:
                std::cout << (duk_to_boolean(ctx, i) ? "true" : "false");
                break;
            case DUK_TYPE_NUMBER:
                std::cout << duk_to_number(ctx, i);
                break;
            case DUK_TYPE_STRING:
                std::cout << "\"" << duk_safe_to_string(ctx, i) << "\"";
                break;
            case DUK_TYPE_OBJECT:
                if (duk_is_array(ctx, i)) std::cout << "[Array]";
                else if (duk_is_c_function(ctx, i)) std::cout << "[CFunction]";
                else if (duk_is_function(ctx, i)) std::cout << "[Function]";
                else if (duk_is_thread(ctx, i)) std::cout << "[Thread]";
                else std::cout << "[Object]";
                break;
            case DUK_TYPE_BUFFER:
                std::cout << "[Buffer]";
                break;
            case DUK_TYPE_POINTER:
                std::cout << "[Pointer]";
                break;
            case DUK_TYPE_LIGHTFUNC:
                std::cout << "[Lightfunc]";
                break;
            default:
                std::cout << "Unknown type";
                break;
        }
        std::cout << "\n";
    }
}

void
dukUtilsPutDetailedError(duk_context *ctx, int errorObjIdAt,
                         const char *fileName, std::string &err) {
    if (duk_get_prop_string(ctx, errorObjIdAt, "stack")) {
        err += "Problem at ";
        err += fileName;
        err += ": ";
        err += duk_safe_to_string(ctx, -1);
        err += "\n";
    }
    duk_pop_n(ctx, 2); // error, stacktrace|undefined
}

static duk_ret_t myPrint(duk_context *ctx) {
    duk_push_string(ctx, " ");
    duk_insert(ctx, 0);
    duk_join(ctx, duk_get_top(ctx) - 1);
    std::cout << duk_safe_to_string(ctx, -1) << "\n";
    return 0;
}

static void
myDukHandleFatalErr(void *myPtr, const char *msg) {
    auto *err = static_cast<std::string*>(myPtr);
    err->append("*** FATAL JS ERROR: ");
    err->append(msg ? msg : "no message");
    err->append("\n");
    std::cerr << *err;
}
