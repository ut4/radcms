#include "../../include/website-js-bindings.hpp"

static duk_ret_t siteConfigLoadFromDisk(duk_context *ctx);

static int receiveIniVal(void *myPtr, const char *section, const char *key,
                         const char *value);
static void putContentTypeField(duk_context *ctx, const char *contentTypeName,
                                const char *fieldName, const char *dataType);
static bool validateKeyVals(duk_context *ctx);

void
websiteJsModuleInit(duk_context *ctx, const int exportsIsAt) {
    duk_get_prop_string(ctx, exportsIsAt, "siteConfig"); // [? siteCfg]
    duk_push_c_lightfunc(ctx, siteConfigLoadFromDisk, 0, 0, 0); // [? siteCfg lightfn]
    duk_put_prop_string(ctx, -2, "loadFromDisk");        // [? siteCfg]
    duk_pop(ctx);                                        // [?]
}

static duk_ret_t
siteConfigLoadFromDisk(duk_context *ctx) {
    duk_push_global_stash(ctx);             // [stash]
    std::string filePath = jsEnvironmentPullAppContext(ctx, -1)->sitePath + "site.ini";
    duk_push_this(ctx);                     // [stash siteCfg]
    // -1 == file open error, -2 == mem error
    if (ini_parse(filePath.c_str(), receiveIniVal, ctx) < 0) {
        return duk_error(ctx, DUK_ERR_TYPE_ERROR, 
                         "Failed to read site.ini '%s'.\n", filePath.c_str());
    }
    // siteConfig.* are now populated, check if they're also valid
    if (validateKeyVals(ctx)) {
        return 0;
    } // else [? err]
    return duk_error(ctx, DUK_ERR_TYPE_ERROR, "%s", duk_get_string(ctx, -1));
}

static int
receiveIniVal(void *myPtr, const char *section, const char *key,
              const char *value) {
                                           // [? siteCfg]
    #define MATCH(s, n) strcmp(section, s) == 0 && strcmp(key, n) == 0
    auto *ctx = static_cast<duk_context*>(myPtr);
    if (MATCH("Site", "name")) {
        duk_push_string(ctx, value);       // [? siteCfg value]
        duk_put_prop_string(ctx, -2, key); // [? siteCfg]
    } else if (strstr(section, "ContentType:") == section) {
        putContentTypeField(ctx, &section[strlen("ContentType:")], key,
                            value);        // [? siteCfg]
    } else {
        std::cerr << "[Warn]: Unknown site.ini setting [" << section << "]" <<
                     key << ".\n";
    }
    return 1;
    #undef MATCH
}

static void
putContentTypeField(duk_context *ctx, const char *contentTypeName,
                    const char *fieldName, const char *dataType) {
    duk_get_prop_string(ctx, -1, "contentTypes");    // [? siteCfg arr]
    duk_size_t l = duk_get_length(ctx, -1);
    if (l > 0) {
        duk_get_prop_index(ctx, -1, l - 1);          // [? siteCfg arr type]
        duk_get_prop_string(ctx, -1, "name");        // [? siteCfg arr type name]
        // Second+ key=val (
        //    [ContentType:foo]
        //    key=val
        //    key2=val2 <--
        //)
        if (strcmp(contentTypeName, duk_get_string(ctx, -1)) == 0) {
            duk_get_prop_string(ctx, -2, "fields");  // [? siteCfg arr type name props]
            duk_push_string(ctx, dataType);          // [? siteCfg arr type name props propVal]
            duk_put_prop_string(ctx, -2, fieldName); // [? siteCfg arr type name props]
            duk_pop_n(ctx, 4);                       // [? siteCfg]
            return;
        }
        // First key=val (
        //    [ContentType:foo]
        //    key=val <---
        //) -> fallthrough
        duk_pop_2(ctx);                              // [? siteCfg arr]
    }
    duk_push_bare_object(ctx);                       // [? siteCfg arr newType]
    duk_push_string(ctx, contentTypeName);           // [? siteCfg arr newType name]
    duk_put_prop_string(ctx, -2, "name");            // [? siteCfg arr newType]
    duk_push_object(ctx);                            // [? siteCfg arr newType props]
    duk_push_string(ctx, dataType);                  // [? siteCfg arr newType props propVal]
    duk_put_prop_string(ctx, -2, fieldName);         // [? siteCfg arr newType props]
    duk_put_prop_string(ctx, -2, "fields");          // [? siteCfg arr newType]
    duk_put_prop_index(ctx, -2, l);                  // [? siteCfg arr]
    duk_pop(ctx);                                    // [? siteCfg]
}

static bool
validateKeyVals(duk_context *ctx) {
                                                     // [? siteCfg]
    duk_get_prop_string(ctx, -1, "contentTypes");    // [? siteCfg arr]
    std::string errors;
    duk_size_t l = duk_get_length(ctx, -1);
    for (duk_size_t i = 0; i < l; ++i) {
        duk_get_prop_index(ctx, -1, i);              // [? siteCfg arr type]
        duk_get_prop_string(ctx, -1, "fields");      // [? siteCfg arr type fields]
        duk_enum(ctx, -1, DUK_ENUM_OWN_PROPERTIES_ONLY); // [? siteCfg arr type fields enum]
        while (duk_next(ctx, -1, true)) {            // [? siteCfg arr type fields enum key val]
            const char *dataType = duk_get_string(ctx, -1);
            if (strcmp(dataType, "text") != 0 &&
                strcmp(dataType, "richtext") != 0) {
                errors += "'" + std::string(dataType) + "' is not valid datatype.\n";
            }
            duk_pop_2(ctx);                          // [? siteCfg arr type fields enum]
        }
        duk_pop_3(ctx);                              // [? siteCfg arr]
    }
    duk_pop(ctx);                                    // [? siteCfg]
    if (!errors.empty()) {
        duk_push_string(ctx, errors.c_str());        // [? siteCfg err]
        return false;
    }
    return true;
}
