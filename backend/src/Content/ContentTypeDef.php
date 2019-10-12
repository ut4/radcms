<?php

namespace RadCms\Content;

class ContentTypeDef {
    public $name;
    public $friendlyName;
    public $fields;
    /**
     * @param string $name
     * @param string $friendlyName
     * @param array $fields
     */
    public function __construct($name, $friendlyName, array $fields) {
        $this->name = $name;
        $this->friendlyName = $friendlyName;
        $this->fields = $fields;
    }
}
