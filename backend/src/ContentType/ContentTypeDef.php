<?php

declare(strict_types=1);

namespace RadCms\ContentType;

use Pike\Translator;

class ContentTypeDef {
    public $name;
    public $friendlyName;
    public $description;
    public $isInternal;
    public $index;
    public $origin;
    public $fields;
    /**
     * @param string $name
     * @param string $friendlyName
     * @param string $description
     * @param array|\RadCms\ContentType\FieldCollection $fields
     * @param int $index
     * @param bool $isInternal = false
     * @param string $origin = 'Website' 'Website' | 'SomePlugin'
     */
    public function __construct(string $name,
                                string $friendlyName,
                                string $description,
                                $fields,
                                int $index,
                                bool $isInternal = false,
                                string $origin = null) {
        $this->name = $name;
        $this->friendlyName = $friendlyName;
        $this->description = $description;
        $this->isInternal = $isInternal;
        $this->index = $index;
        $this->origin = $origin ?? 'Website';
        $this->fields = !($fields instanceof FieldCollection)
            ? FieldCollection::fromCompactForm($fields)
            : $fields;
    }
    /**
     * @param string $origin = null
     * @param \Pike\Translator $translator = null
     * @return \stdClass {name: string, friendlyName: string ...}
     */
    public function toCompactForm(string $origin = null,
                                  Translator $translator = null): \stdClass {
        return (object) [
            'name' => $this->name,
            'friendlyName' => !$translator ? $this->friendlyName : $translator->t($this->name),
            'description' => $this->description,
            'isInternal' => $this->isInternal,
            'origin' => $origin ?? $this->origin,
            'fields' => $this->fields->toCompactForm($translator),
        ];
    }
}
