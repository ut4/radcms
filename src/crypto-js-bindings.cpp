#include "../../include/crypto-js-bindings.hpp"

static duk_ret_t cryptoCalcSha1(duk_context *ctx);

void
cryptoJsModuleInit(duk_context *ctx, const int exportsIsAt) {
    duk_push_c_lightfunc(ctx, cryptoCalcSha1, 1, 0, 0); // [? lightfn]
    duk_put_prop_string(ctx, exportsIsAt, "sha1");      // [?]
}

static duk_ret_t
cryptoCalcSha1(duk_context *ctx) {
    const char *input = duk_require_string(ctx, 0);
    unsigned char hash[SHA_DIGEST_LENGTH];
    SHA1((const unsigned char*)input, strlen(input), hash);
    //
    char out[SHA_DIGEST_LENGTH * 2 + 1];
    for (int i = 0; i < SHA_DIGEST_LENGTH; ++i) {
        sprintf(&out[i * 2], "%02x", hash[i]);
    }
    duk_push_string(ctx, out);
    return 1;
}
