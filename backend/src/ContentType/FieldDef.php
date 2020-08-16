<?php

declare(strict_types=1);

namespace RadCms\ContentType;

class FieldDef {
    /** @var string */
    public $name;
    /** @var string */
    public $friendlyName;
    /** @var string ContentTypeValidator::FIELD_DATA_TYPES[*] */
    public $dataType;
    /** @var \stdClass */
    public $widget;
    /** @var string */
    public $defaultValue;
    /** @var int */
    public $visibility;
    /**
     * @param string $name
     * @param string $friendlyName
     * @param string $dataType ContentTypeValidator::FIELD_DATA_TYPES[*]
     * @param \stdClass $widget
     * @param string $defaultValue
     * @param int $visibility 0
     */
    public function __construct(string $name,
                                string $friendlyName,
                                string $dataType = 'text',
                                \stdClass $widget = null,
                                string $defaultValue = '',
                                int $visibility = 0) {
        $this->name = $name;
        $this->friendlyName = strlen($friendlyName) ? $friendlyName : $name;
        $this->dataType = $dataType;
        $this->widget = $widget ?? (object)['name' => 'textField', 'args' => null];
        $this->defaultValue = $defaultValue;
        $this->visibility = $visibility;
    }
    /**
     * @param \Closure $formatterFn = null fn(\RadCms\ContentType\FieldDef $field): string
     * @return string '`name`, `name2`'
     */
    public function toSqlCol(\Closure $formatterFn = null): string {
        if (!$formatterFn)
            return "`{$this->name}`";
        return $formatterFn($this);
    }
    /**
     * @return string '`name` TEXT'
     */
    public function toSqlTableField(): string {
        return "`{$this->name}` " . [
            'text' => 'TEXT',
            'json' => 'JSON',
            'int' => 'INT',
            'uint' => 'INT UNSIGNED',
        ][$this->dataType];
    }

    ////////////////////////////////////////////////////////////////////////////

    /**
     * @param object $input array<{name: string, friendlyName: string, dataType: string, widget: {name: string, args?: object}, defaultValue: string, visibility: int}> Olettaa että on validi
     * @return \RadCms\ContentType\FieldDef
     */
    public static function fromObject(\stdClass $input): FieldDef {
        return new FieldDef($input->name ?? '',
                            $input->friendlyName ?? '',
                            $input->dataType ?? '',
                            is_object($input->widget ?? null) ? (object) [
                                'name' => $input->widget->name ?? '',
                                'args' => $input->widget->args ?? null
                            ] : null,
                            $input->defaultValue ?? '',
                            $input->visibility ?? 0);
    }
}
