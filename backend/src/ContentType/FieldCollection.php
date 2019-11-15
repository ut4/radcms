<?php

namespace RadCms\ContentType;

use RadCms\Framework\GenericArray;

/**
 * ContentTypeDef->fields.
 */
class FieldCollection extends GenericArray implements \JsonSerializable {
    /**
     * ...
     */
    protected function __construct() {
        parent::__construct(\stdClass::class);
    }
    /**
     * @param \Closure $formatterFn = null ($field: object): string
     * @return string '`name`, `name2`'
     */
    public function toSqlCols($formatterFn = null) {
        return implode(', ', array_map($formatterFn ?? function($f) {
            return "`{$f->name}`";
        }, $this->vals));
    }
    /**
     * @return string '`name` TEXT, `name2` VARCHAR'
     */
    public function toSqlTableFields() {
        return implode(',', array_map(function ($f) {
            return "`{$f->name}` " . [
                'text' => 'TEXT',
                'json' => 'TEXT'
            ][$f->dataType];
        }, $this->vals));
    }
    /**
     * @return array see self::fromCompactForm()
     */
    public function toCompactForm() {
        return array_reduce($this->vals, function ($out, $f) {
            $out[$f->name] = $f->dataType . (!$f->widget ? '' : ':' . $f->widget);
            return $out;
        }, []);
    }
    /**
     * @return string
     */
    public function jsonSerialize() {
        return $this->toArray();
    }

    ////////////////////////////////////////////////////////////////////////////

    /**
     * @param array $compactFields ['name' => 'dataType', 'another' => 'dataType:widgetName' ...]
     */
    public static function fromCompactForm($compactFields) {
        $out = new FieldCollection();
        foreach ($compactFields as $name => $typeInfo) {
            $pcs = explode(':', $typeInfo);
            $out->add((object)['name' => $name,
                               'dataType' => $pcs[0],
                               'widget' => $pcs[1] ?? null]);
        }
        return $out;
    }
}
