#include "../include/duk.h"

static duk_ret_t
myPrint(duk_context *ctx);

static void
myDukHandleFatalErr(void *udata, const char *msg);

duk_context*
myDukCreate(char *errBuf) {
    duk_context *out = duk_create_heap(
        NULL,          // alloc, use default
        NULL,          // realloc, use default
        NULL,          // free, use default
        (void*)errBuf, // myPtr to myDukHandleFatalErr
        myDukHandleFatalErr
    );
    if (!out) return NULL;
    duk_push_c_function(out, myPrint, DUK_VARARGS);
    duk_put_global_string(out, "print");
    return out;
}

void
dukUtilsDumpStack(duk_context *ctx) {
    int l = duk_get_top(ctx);
    for (int i = 0; i < l; ++i) {
        printf("%d: ", i);
        switch (duk_get_type(ctx, i)) {
            case DUK_TYPE_UNDEFINED:
                printf("undefined");
                break;
            case DUK_TYPE_NULL:
                printf("null");
                break;
            case DUK_TYPE_BOOLEAN:
                printf(duk_to_boolean(ctx, i)?"true":"false");
                break;
            case DUK_TYPE_NUMBER:
                printf("%f", duk_to_number(ctx, i));
                break;
            case DUK_TYPE_STRING:
                printf("\"%s\"", duk_safe_to_string(ctx, i));
                break;
            case DUK_TYPE_OBJECT:
                if (duk_is_array(ctx, i)) printf("[Array]");
                else if (duk_is_function(ctx, i)) printf("[Function]");
                else if (duk_is_c_function(ctx, i)) printf("[CFunction]");
                else if (duk_is_thread(ctx, i)) printf("[Thread]");
                else printf("[Object]");
                break;
            case DUK_TYPE_BUFFER:
                printf("[Buffer]");
                break;
            case DUK_TYPE_POINTER:
                printf("[Pointer]");
                break;
            case DUK_TYPE_LIGHTFUNC:
                printf("[Lightfunc]");
                break;
            default:
                printf("Unknown type");
                break;
        }
        printf("\n");
    }
}

static duk_ret_t myPrint(duk_context *ctx) {
    duk_push_string(ctx, " ");
    duk_insert(ctx, 0);
    duk_join(ctx, duk_get_top(ctx) - 1);
    printf("%s\n", duk_safe_to_string(ctx, -1));
    return 0;
}

static void
myDukHandleFatalErr(void *myPtr, const char *msg) {
    char *err = (char*)myPtr;
    putError("*** FATAL JS ERROR: %s\n", (msg ? msg : "no message"));
}
