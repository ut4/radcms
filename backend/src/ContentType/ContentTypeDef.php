<?php

namespace RadCms\ContentType;

class ContentTypeDef {
    public $name;
    public $friendlyName;
    public $fields;
    public $origin;
    public $isInternal;
    /**
     * @param string $name
     * @param string $friendlyName
     * @param array|object $compactFields ['fieldName' => 'dataType:widget', 'another' => 'dataType'...]
     * @param string $origin = 'site.json' 'site.json' | 'SomePlugin.json'
     * @param bool $isInternal = false
     */
    public function __construct($name,
                                $friendlyName,
                                $compactFields,
                                $origin = 'site.json',
                                $isInternal = false) {
        $this->name = $name;
        $this->friendlyName = $friendlyName;
        $this->fields = FieldCollection::fromCompactForm($compactFields);
        $this->origin = $origin;
        $this->isInternal = $isInternal;
    }
}
