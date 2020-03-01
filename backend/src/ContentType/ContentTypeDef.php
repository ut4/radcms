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
     * @param array|\stdClass|\RadCms\ContentType\FieldCollection $fields ['fieldName' => 'dataType:widget', 'another' => 'dataType'...]
     * @param bool $isInternal = false
     * @param string $origin = 'site.json' 'site.json' | 'SomePlugin.json'
     */
    public function __construct($name,
                                $friendlyName,
                                $fields,
                                $isInternal = false,
                                $origin = 'site.json') {
        $this->name = $name;
        $this->friendlyName = $friendlyName;
        $this->fields = !($fields instanceof FieldCollection)
            ? FieldCollection::fromCompactForm($fields)
            : $fields;
        $this->isInternal = $isInternal;
        $this->origin = $origin;
    }
    /**
     * @param string $origin
     * @param \Pike\Translator $translator = null
     * @return array {key: string, definition: [string, array[], string]}
     */
    public function toCompactForm($origin, Translator $translator = null) {
        return (object)[
            'key' => $this->name . (!$this->isInternal ? '' : ':internal'),
            'definition' => [!$translator ? $this->friendlyName : $translator->t($this->name),
                             $this->fields->toCompactForm($translator),
                             $origin]
        ];
    }
}
