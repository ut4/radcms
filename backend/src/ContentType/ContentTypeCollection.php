<?php

namespace RadCms\ContentType;

use RadCms\Framework\GenericArray;

class ContentTypeCollection extends GenericArray {
    /**
     * .
     */
    public function __construct() {
        parent::__construct(ContentTypeDef::class);
    }
}
