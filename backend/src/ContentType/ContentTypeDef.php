<?php

namespace RadCms\ContentType;

class ContentTypeDef {
    public $name;
    public $friendlyName;
    public $fields;
    public $origin;
    /**
     * @param string $name
     * @param string $friendlyName
     * @param array $fields
     * @param string $origin = 'site.ini' 'site.ini' | 'SomePlugin.ini'
     */
    public function __construct($name, $friendlyName, array $fields, $origin = 'site.ini') {
        $this->name = $name;
        $this->friendlyName = $friendlyName;
        $this->fields = $fields;
        $this->origin = $origin;
    }
    /**
     * @return string
     */
    public function fieldsToSql() {
        return implode(', ', array_map(function($name) {
            return "`{$name}`";
        }, array_keys($this->fields)));
    }
}
