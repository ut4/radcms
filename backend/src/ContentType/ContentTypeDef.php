<?php

namespace RadCms\ContentType;

class ContentTypeDef {
    public $name;
    public $friendlyName;
    public $fields;
    public $isInternal;
    public $origin;
    /**
     * @param string $name
     * @param string $friendlyName
     * @param array|\stdClass $compactFields ['fieldName' => 'dataType:widget', 'another' => 'dataType'...]
     * @param bool $isInternal = false
     * @param string $origin = 'site.json' 'site.json' | 'SomePlugin.json'
     */
    public function __construct($name,
                                $friendlyName,
                                $compactFields,
                                $isInternal = false,
                                $origin = 'site.json') {
        $this->name = $name;
        $this->friendlyName = $friendlyName;
        $this->fields = FieldCollection::fromCompactForm($compactFields);
        $this->isInternal = $isInternal;
        $this->origin = $origin;
    }
}
