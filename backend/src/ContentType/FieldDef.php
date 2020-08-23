<?php

declare(strict_types=1);

namespace RadCms\ContentType;

class FieldDef {
    /** @var string */
    public $name;
    /** @var string */
    public $friendlyName;
    /** @var \RadCms\ContentType\DataType */
    public $dataType;
    /** @var \stdClass */
    public $widget;
    /** @var string */
    public $defaultValue;
    /** @var int */
    public $visibility;
    /** @var array[] [ ['required'], ['maxLength', 32] ] */
    public $validationRules;
    /**
     * @param string $name
     * @param string $friendlyName
     * @param ?object $dataTypeObj = null
     * @param ?\stdClass $widget = null
     * @param ?string $defaultValue = null
     * @param ?int $visibility = null
     * @param ?array $validationRules = null
     */
    public function __construct(string $name,
                                string $friendlyName,
                                ?object $dataTypeObj = null,
                                ?\stdClass $widget = null,
                                ?string $defaultValue = null,
                                ?int $visibility = null,
                                ?array $validationRules = null) {
        $this->name = $name;
        $this->friendlyName = strlen($friendlyName) ? $friendlyName : $name;
        $this->dataType = $dataTypeObj ? DataType::fromObject($dataTypeObj) : new DataType('text');
        $this->widget = $widget ?? (object)['name' => 'textField', 'args' => null];
        $this->defaultValue = $defaultValue ?? '';
        $this->visibility = $visibility ?? 0;
        $this->validationRules = $validationRules;
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
     * @return string '`name` TEXT' or '`title` VARCHAR(127)'
     */
    public function toSqlTableField(): string {
        return "`{$this->name}` {$this->dataType->toSql()}";
    }

    ////////////////////////////////////////////////////////////////////////////

    /**
     * @param object $input array<{name: string, friendlyName: string, dataType: string, widget: {name: string, args?: object}, defaultValue: string, visibility: int, validationRules: array[]}>
     * @return \RadCms\ContentType\FieldDef
     */
    public static function fromObject(\stdClass $input): FieldDef {
        return new FieldDef($input->name ?? '',
                            $input->friendlyName ?? '',
                            $input->dataType ?? null,
                            is_object($input->widget ?? null) ? (object) [
                                'name' => $input->widget->name ?? '',
                                'args' => $input->widget->args ?? null
                            ] : null,
                            $input->defaultValue ?? null,
                            $input->visibility ?? null,
                            $input->validationRules ?? null);
    }
}

class DataType {
    /** @var string */
    public $type;
    /** @var ?int */
    public $length;
    /**
     * @param string $type
     * @param ?int $length = null
     */
    public function __construct(string $type, ?int $length = null) {
        $this->type = $type;
        $this->length = $length;
    }
    /**
     * @return string 'text', 'int64'
     */
    public function __toString(): string {
        return $this->type . ($this->length ?? '');
    }
    /**
     * @return string 'TEXT', 'INT(64)'
     */
    public function toSql(): string {
        $len = $this->length ?? 0;
        switch ($this->type) {
        case 'text':
            $t = (!$len ? 'TEXT' : 'VARCHAR') . '%s';
            break;
        case 'json':
            $t = 'JSON';
            $len = 0;
            break;
        case 'int':
            $t = 'INT%s';
            break;
        case 'uint':
            $t = 'INT%s UNSIGNED';
            break;
        default:
            $t = 'TEXT%s';
        }
        return sprintf($t, !$len ? '' : "({$len})");
    }
    /**
     * @param object $obj {type: string, length?: int}
     * @return \RadCms\ContentType\DataType
     */
    public static function fromObject(object $obj): DataType {
        return new DataType($obj->type ?? 'text', $obj->length ?? null);
    }
}
