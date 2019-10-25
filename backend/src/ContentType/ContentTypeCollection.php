<?php

namespace RadCms\ContentType;

use RadCms\Framework\GenericArray;
use RadCms\Framework\Db;

class ContentTypeCollection extends GenericArray {
    /**
     * .
     */
    public function __construct() {
        parent::__construct(ContentTypeDef::class);
    }
}
