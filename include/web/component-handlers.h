#ifndef insn_componentHandlers_h
#define insn_componentHandlers_h

#include "../component-mapper.h"
#include "../web-app.h"

/**
 * Responds to POST /component. Payload:
 * name=str|required&
 * json=str|required&
 * componentTypeId=int|required|min:0
 */
unsigned
componentHandlersHandleComponentAddRequest(void *myPtr, void *myDataPtr, const char *method,
                                           const char *url, struct MHD_Response **response,
                                           char *err);

FormDataHandlers*
componentHandlersGetComponentAddDataHandlers();

#endif