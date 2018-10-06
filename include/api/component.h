#ifndef rad3_api$component_h
#define rad3_api$component_h

#include <stdbool.h>
#include "../web-common.h"

/*
 * Responds to GET /api/components
 */
unsigned int
componentGetAll(struct MHD_Response **res);

bool
componentIsPutUrl(const char *url);

/*
 * Responds to PUT /api/component/{id}
 */
unsigned int
componentUpdate(struct MHD_Response **res);

/*unsigned int
doSomething(struct MHD_Response** res) {
    char *str = ALLOCATE(char, 8);
    str[0] = '\0';
    strncat(str, "abcdefg", 7);
    *res = MHD_create_response_from_buffer(strlen(str), (void*)str,
                                           MHD_RESPMEM_MUST_FREE);
    MHD_add_response_header(*res, "Content-Type", "text/html");
    return MHD_HTTP_OK;
}*/

#endif