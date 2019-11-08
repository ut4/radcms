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
     * @param array $fields ['fieldName' => 'dataType:widget', 'another' => 'dataType'...]
     * @param string $origin = 'site.ini' 'site.ini' | 'SomePlugin.ini'
     */
    public function __construct($name,
                                $friendlyName,
                                array $fields,
                                $origin = 'site.ini') {
        $this->name = $name;
        $this->friendlyName = $friendlyName;
        $this->fields = [];
        foreach ($fields as $name => $typeInfo) {
            $pcs = explode(':', $typeInfo);
            $this->fields[$name] = (object)['dataType' => $pcs[0],
                                            'widget' => $pcs[1] ?? null];
        }
        $this->origin = $origin;
    }
    /**
     * @param \Closure $formatterFn = null ($fieldName: string): string
     * @return string
     */
    public function fieldsToSqlCols($formatterFn = null) {
        return implode(', ', array_map($formatterFn ?? function($name) {
            return "`{$name}`";
        }, array_keys($this->fields)));
    }
    /**
     * @return array [friendlyName, widgets]
     */
    public function serialize() {
        $fields = (object)[];
        foreach ($this->fields as $name => $f)
            $fields->$name = $f->dataType . (!$f->widget ? '' : ':' . $f->widget);
        return [$this->friendlyName, $fields];
    }
}
