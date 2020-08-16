<?php

declare(strict_types=1);

namespace RadCms\ContentType;

use Pike\Translator;

class ContentTypeDef {
    /** @var string */
    public $name;
    /** @var string */
    public $friendlyName;
    /** @var string */
    public $description;
    /** @var bool */
    public $isInternal;
    /** @var int */
    public $index;
    /** @var string */
    public $origin;
    /** @var \RadCms\ContentType\FieldCollection */
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
    /**
     * @param \stdClass $input
     * @param int $index
     * @return \RadCms\ContentType\ContentTypeDef
     */
    public static function fromObject(\stdClass $input, int $index = 0): ContentTypeDef {
        return new ContentTypeDef($input->name ?? '',
                                  $input->friendlyName ?? '',
                                  $input->description ?? '',
                                  is_array($input->fields ?? null)
                                      ? $input->fields
                                      : new FieldCollection,
                                  $index,
                                  $input->isInternal ?? false,
                                  $input->origin ?? null);
    }
}
