#include "../../include/xml-reader-js-bindings.hpp"

constexpr const char* KEY_SELF_PTR = DUK_HIDDEN_SYMBOL("_XmlUploaderPtr");
constexpr const char* KEY_NODE_PTR = DUK_HIDDEN_SYMBOL("_XmlNodePtr");
constexpr const char* KEY_XML_NODE_PROTO = "_XmlNodeProto";

struct XmlReader {
    std::string xmlSource;
    rapidxml::xml_document<> doc;
};

static duk_ret_t xmlReaderConstruct(duk_context *ctx);
static duk_ret_t xmlReaderFinalize(duk_context *ctx);
static duk_ret_t xmlReaderParse(duk_context *ctx);
static duk_ret_t xmlNodeGetFirstChild(duk_context *ctx);
static duk_ret_t xmlNodeGetNextSibling(duk_context *ctx);
static duk_ret_t xmlNodeGetContent(duk_context *ctx);
static rapidxml::xml_node<>* pullNodePtr(duk_context *ctx, const int thisIsAt);
static void pushJsXmlNode(duk_context *ctx, rapidxml::xml_node<> *node);

void
xmlReaderJsModuleInit(duk_context *ctx, const int exportsIsAt) {
    // module.XmlReader
    duk_push_c_function(ctx, xmlReaderConstruct, 0);       // [? XmlReader]
    duk_push_bare_object(ctx);                             // [? XmlReader proto]
    duk_push_c_lightfunc(ctx, xmlReaderParse, 1, 0, 0);    // [? XmlReader proto lightfn]
    duk_put_prop_string(ctx, -2, "parse");                 // [? XmlReader proto]
    duk_put_prop_string(ctx, -2, "prototype");             // [? XmlReader]
    duk_put_prop_string(ctx, exportsIsAt, "XmlReader");    // [?]
    // stash._XmlNodeProto
    duk_push_global_stash(ctx);                            // [? stash]
    duk_push_bare_object(ctx);                             // [? stash proto]
    duk_push_c_lightfunc(ctx, xmlNodeGetFirstChild, DUK_VARARGS, 0, 0); // [? stash proto lightfn]
    duk_put_prop_string(ctx, -2, "getFirstChild");         // [? stash proto]
    duk_push_c_lightfunc(ctx, xmlNodeGetNextSibling, DUK_VARARGS, 0, 0); // [? stash proto lightfn]
    duk_put_prop_string(ctx, -2, "getNextSibling");        // [? stash proto]
    duk_push_c_lightfunc(ctx, xmlNodeGetContent, 0, 0, 0); // [? stash proto lightfn]
    duk_put_prop_string(ctx, -2, "getContent");            // [? stash proto]
    duk_put_prop_string(ctx, -2, KEY_XML_NODE_PROTO);      // [? stash]
    duk_pop(ctx);                                          // [?]
}

static duk_ret_t
xmlReaderConstruct(duk_context *ctx) {
    if (!duk_is_constructor_call(ctx)) return DUK_RET_TYPE_ERROR;
    auto *self = new XmlReader;
    duk_push_this(ctx);                             // [this]
    duk_push_pointer(ctx, self);                    // [this ptr]
    duk_put_prop_string(ctx, -2, KEY_SELF_PTR);     // [this]
    duk_push_c_function(ctx, xmlReaderFinalize, 1); // [this cfunc]
    duk_set_finalizer(ctx, -2);                     // [this]
	return 0;
}

static duk_ret_t
xmlReaderFinalize(duk_context *ctx) {
                                               // [this]
    duk_get_prop_string(ctx, 0, KEY_SELF_PTR); // [this ptr]
    delete static_cast<XmlReader*>(duk_get_pointer(ctx, -1));
    return 0;
}

static duk_ret_t
xmlReaderParse(duk_context *ctx) {
    duk_push_this(ctx);                         // [arg1 this]
    duk_get_prop_string(ctx, -1, KEY_SELF_PTR); // [arg1 this ptr]
    auto *self = static_cast<XmlReader*>(duk_get_pointer(ctx, -1));
    std::string &to = self->xmlSource;
    std::string err;
    if (myFsRead(duk_require_string(ctx, 0), to, err)) {
        self->doc.parse<0>((char*)to.c_str());  // 0 means default parse flags
        pushJsXmlNode(ctx, &self->doc);         // [arg1 this ptr ... node]
        return 1;
    }
    return duk_error(ctx, DUK_ERR_TYPE_ERROR, err.c_str());
}

static duk_ret_t
xmlNodeGetFirstChild(duk_context *ctx) {
    const char *tagName = duk_get_top(ctx) > 0 ? duk_require_string(ctx, 0) : nullptr;
    duk_push_this(ctx);       // [this]
    auto *node = pullNodePtr(ctx, -1)->first_node(tagName);
    pushJsXmlNode(ctx, node); // [this ... node|null]
    return 1;
}

static duk_ret_t
xmlNodeGetNextSibling(duk_context *ctx) {
    const char *tagName = duk_get_top(ctx) > 0 ? duk_require_string(ctx, 0) : nullptr;
    duk_push_this(ctx);       // [this]
    auto *node = pullNodePtr(ctx, -1)->next_sibling(tagName);
    pushJsXmlNode(ctx, node); // [this ... node|null]
    return 1;
}

static duk_ret_t
xmlNodeGetContent(duk_context *ctx) {
    duk_push_this(ctx);               // [this]
    auto *n = pullNodePtr(ctx, -1);
    duk_push_string(ctx, n->value()); // [this out]
    return 1;
}

static rapidxml::xml_node<>*
pullNodePtr(duk_context *ctx, const int thisIsAt) {
    assert(thisIsAt < 0 && "...");
    duk_get_prop_string(ctx, thisIsAt, KEY_NODE_PTR); // [? ptr]
    auto *out = static_cast<rapidxml::xml_node<>*>(duk_get_pointer(ctx, -1));
    duk_pop(ctx);
    return out;
}

static void
pushJsXmlNode(duk_context *ctx, rapidxml::xml_node<> *node) {
    if (node) {
        duk_push_global_stash(ctx);                // [? stash]
        duk_push_bare_object(ctx);                 // [? stash node]
        duk_push_uint(ctx, node->type());          // [? stash node type]
        duk_put_prop_string(ctx, -2, "type");      // [? stash node]
        duk_push_string(ctx, node->name());        // [? stash node name]
        duk_put_prop_string(ctx, -2, "name");      // [? stash node]
        duk_push_pointer(ctx, node);               // [? stash node ptr]
        duk_put_prop_string(ctx, -2, KEY_NODE_PTR);// [? stash node]
        duk_get_prop_string(ctx, -2, KEY_XML_NODE_PROTO); // [? stash node nodeProto]
        duk_set_prototype(ctx, -2);                // [? stash node]
    } else {
        duk_push_null(ctx);                        // [? null]
    }
}
