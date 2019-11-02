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
     * @param \Closure $formatterFn = null ($fieldName: string): string
     * @return string
     */
    public function fieldsToSql($formatterFn = null) {
        return implode(', ', array_map($formatterFn ?? function($name) {
            return "`{$name}`";
        }, array_keys($this->fields)));
    }
}
