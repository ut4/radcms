<?php

namespace RadCms\ContentType;

use Pike\GenericArray;
use Pike\Translator;

/**
 * ContentTypeDef->fields.
 */
class FieldCollection extends GenericArray implements \JsonSerializable {
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
                'json' => 'TEXT',
                'int' => 'INT',
            ][$f->dataType];
        }, $this->vals));
    }
    /**
     * @param \Pike\Translator $translator = null
     * @return array see self::fromCompactForm()
     */
    public function toCompactForm(Translator $translator = null) {
        $out = [];
        foreach ($this->toArray() as $f)
            $out[$f->name] = [$f->dataType,
                              !$translator ? $f->friendlyName : $translator->t($f->name),
                              $f->widget];
        return $out;
    }
    /**
     * @return string
     */
    public function jsonSerialize() {
        return $this->toArray();
    }

    ////////////////////////////////////////////////////////////////////////////

    /**
     * @param array|object $compactFields ['name' => ['dataType'], 'another' => 'datatype', 'yetanother' => ['dataType', 'FriendlyName', 'widgetName'] ...]
     * @return \RadCms\ContentType\FieldCollection
     */
    public static function fromCompactForm($compactFields) {
        $out = new FieldCollection('stdClass');
        foreach ($compactFields as $name => $def) {
            $remainingArgs = !is_string($def) ? $def : explode(':', $def);
            $out->add((object)['name' => $name,
                               'friendlyName' => $remainingArgs[1] ?? $name,
                               'dataType' => $remainingArgs[0],
                               'widget' => $remainingArgs[2] ?? ContentTypeValidator::FIELD_WIDGETS[0]]);
        }
        return $out;
    }
}
