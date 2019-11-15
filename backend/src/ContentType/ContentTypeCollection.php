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
    /**
     * @param string $origin
     * @return array ['name' => ['friendlyName', <compactFields>, 'origin'] ...]
     */
    public function toCompactForm($origin) {
        return array_reduce($this->toArray(), function ($out, $t) use ($origin) {
            $out[$t->name] = [$t->friendlyName, $t->fields->toCompactForm(), $origin];
            return $out;
        }, []);
    }
}
