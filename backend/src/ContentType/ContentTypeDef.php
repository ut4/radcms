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
     * @param array $compactFields ['fieldName' => 'dataType:widget', 'another' => 'dataType'...]
     * @param string $origin = 'site.ini' 'site.ini' | 'SomePlugin.ini'
     */
    public function __construct($name,
                                $friendlyName,
                                array $compactFields,
                                $origin = 'site.ini') {
        $this->name = $name;
        $this->friendlyName = $friendlyName;
        $this->fields = FieldCollection::fromCompactForm($compactFields);
        $this->origin = $origin;
    }
}
