#include "../../include/web/component-handlers.h"

const char *nameReqError = "Name is required.\n";
const char *jsonReqError = "Json is required.\n";
const char *ctidReqError = "Component type id is required.\n";

static bool
receiveFormField(const char *key, const char *value, void *myPtr);

static void*
makeComponentFormData();

static void
freeComponentFormData(void *myPtr);

FormDataHandlers*
componentHandlersGetComponentAddDataHandlers() {
    FormDataHandlers *out = ALLOCATE(FormDataHandlers);
    out->formDataReceiverFn = receiveFormField;
    out->formDataInitFn = makeComponentFormData;
    out->formDataFreeFn = freeComponentFormData;
    out->myPtr = NULL;
    return out;
}

unsigned
componentHandlersHandleComponentAddRequest(void *myPtr, void *myDataPtr, const char *method,
                                           const char *url, struct MHD_Response **response,
                                           char *err) {
    if (!myDataPtr) {
        return (unsigned)(strcmp(method, "POST") == 0 && strcmp(url, "/api/component") == 0);
    }
    ComponentFormData *data = myDataPtr;
    int insertId = componentMapperInsertComponent(((Website*)myPtr)->db, data, err);
    if (insertId < 0) {
        if (data->errors) {
            const unsigned a = hasFlag(data->errors, CMP_NAME_REQUIRED) ? strlen(nameReqError) : 0;
            const unsigned b = hasFlag(data->errors, CMP_JSON_REQUIRED) ? strlen(jsonReqError) : 0;
            const unsigned c = hasFlag(data->errors, CMP_COMPONENT_TYPE_ID_REQUIRED) ? strlen(ctidReqError) : 0;
            const unsigned l = a + b + c + 1;
            char *message = ALLOCATE_ARR_NO_COUNT(char, l);
            char *tail = message;
            if (a > 0) { memcpy(tail, nameReqError, a); tail += a; }
            if (b > 0) { memcpy(tail, jsonReqError, b); tail += b; }
            if (c > 0) { memcpy(tail, ctidReqError, c); tail += c; }
            *tail = '\0';
            *response = MHD_create_response_from_buffer(
                l - 1, message, MHD_RESPMEM_MUST_FREE);
            return MHD_HTTP_BAD_REQUEST;
        }
        return MHD_HTTP_INTERNAL_SERVER_ERROR;
    }
    const unsigned l = insertId > 0 ? (log10(insertId) + 1) + 1 : 2;
    char *responseBody = ALLOCATE_ARR_NO_COUNT(char, l);
    snprintf(responseBody, l, "%i", insertId);
    *response = MHD_create_response_from_buffer(l - 1,
                                                responseBody,
                                                MHD_RESPMEM_MUST_FREE);
    return MHD_HTTP_OK;
}

static bool
receiveFormField(const char *key, const char *value, void *myPtr) {
    if (strcmp(key, "name") == 0) {
        ((ComponentFormData*)myPtr)->cmp.name = copyString(value);
    } else if (strcmp(key, "json") == 0) {
        ((ComponentFormData*)myPtr)->cmp.json = copyString(value);
    } else if (strcmp(key, "componentTypeId") == 0) {
        ((ComponentFormData*)myPtr)->cmp.componentTypeId = strtol(value, NULL, 10);
    }
    return true;
}

static void*
makeComponentFormData() {
    ComponentFormData *out = ALLOCATE(ComponentFormData);
    componentInit(&out->cmp);
    out->errors = 0;
    return out;
}

static void
freeComponentFormData(void *myPtr) {
    Component *c = &((ComponentFormData*)myPtr)->cmp;
    componentFreeProps(c);
    FREE(ComponentFormData, myPtr);
}
