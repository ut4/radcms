#ifndef rad3_api$contentType_h
#define rad3_api$contentType_h

#include "../web-common.h"

/*
 * Responds to POST /api/content-type 
 */
unsigned int
contentTypeCreate(struct MHD_Response **res);

// etc ..

#endif