<?php

namespace RadCms\ContentType;

class FieldDef {
    public $name;
    public $friendlyName;
    public $dataType;
    public $widget;
    public $defaultValue;
    public $visibility;
    /**
     * @param string $name
     * @param string $friendlyName
     * @param string $dataType
     * @param \stdClass $widget
     * @param string $defaultValue
     * @param int $visibility
     */
    public function __construct($name,
                                $friendlyName,
                                $dataType,
                                $widget,
                                $defaultValue,
                                $visibility) {
        $this->name = $name;
        $this->friendlyName = $friendlyName;
        $this->dataType = $dataType;
        $this->widget = $widget;
        $this->defaultValue = $defaultValue;
        $this->visibility = $visibility;
    }
    /**
     * @param \Closure $formatterFn = null fn(\RadCms\ContentType\FieldDef $field): string
     * @return string '`name`, `name2`'
     */
    public function toSqlCol($formatterFn = null) {
        if (!$formatterFn)
            return "`{$this->name}`";
        return $formatterFn($this);
    }
    /**
     * @return string '`name` TEXT'
     */
    public function toSqlTableField() {
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
    public static function fromObject($input) {
        return new FieldDef($input->name,
                            $input->friendlyName,
                            $input->dataType,
                            (object) [
                                'name' => $input->widget->name,
                                'args' => $input->widget->args ?? null
                            ],
                            $input->defaultValue ?? '',
                            $input->visibility ?? 0);
    }
}
