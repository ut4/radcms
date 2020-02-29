<?php

namespace RadCms\ContentType;

use Pike\Translator;

/**
 * ContentTypeDef->fields.
 */
class FieldCollection extends \ArrayObject implements \JsonSerializable {
    /**
     * @param callable $formatterFn = null fn({name: string, friendlyName: string, dataType: string, widget: string, defaultValue: string} $field): string
     * @return string '`name`, `name2`'
     */
    public function toSqlCols($formatterFn = null) {
        return implode(', ', array_map($formatterFn ?? function($f) {
            return "`{$f->name}`";
        }, $this->getArrayCopy()));
    }
    /**
     * @return string '`name` TEXT, `name2` VARCHAR'
     */
    public function toSqlTableFields() {
        return implode(',', array_map(function ($f) {
            return "`{$f->name}` " . [
                'text' => 'TEXT',
                'json' => 'JSON',
                'int' => 'INT',
            ][$f->dataType];
        }, $this->getArrayCopy()));
    }
    /**
     * @param \Pike\Translator $translator = null
     * @return array see self::fromCompactForm()
     */
    public function toCompactForm(Translator $translator = null) {
        $out = [];
        foreach ($this as $f)
            $out[$f->name] = [$f->dataType,
                              !$translator ? $f->friendlyName : $translator->t($f->name),
                              $f->widget->toCompactForm(),
                              $f->defaultValue];
        return $out;
    }
    /**
     * @return array
     */
    public function jsonSerialize() {
        return $this->getArrayCopy();
    }

    ////////////////////////////////////////////////////////////////////////////

    /**
     * @param array|\stdClass $compactFields ['name' => ['dataType'], 'another' => 'datatype', 'yetanother' => ['dataType', 'FriendlyName', 'widgetName'], 'withArgs' => ['dataType', 'FriendlyName', 'widgetName(arg1, arg2=foo)'] ...]
     * @return \RadCms\ContentType\FieldCollection
     */
    public static function fromCompactForm($compactFields) {
        $out = new FieldCollection;
        $DEFAULT_WIDGET = new FieldSetting(ContentTypeValidator::FIELD_WIDGETS[0]);
        foreach ($compactFields as $name => $def) {
            $remainingArgs = !is_string($def) ? $def : explode(':', $def);
            $out[] = (object)['name' => $name,
                              'friendlyName' => $remainingArgs[1] ?? $name,
                              'dataType' => $remainingArgs[0],
                              'widget' => !isset($remainingArgs[2])
                                  ? $DEFAULT_WIDGET
                                  : FieldSetting::fromCompactForm($remainingArgs[2]),
                              'defaultValue' => $remainingArgs[3] ?? ''];
        }
        return $out;
    }
    /**
     * @param array $input array<{name: string, friendlyName: string, dataType: string, widget: {name: string, args?: object}, defaultValue: string}> Olettaa että on validi
     * @return \RadCms\ContentType\FieldCollection
     */
    public static function fromArray(array $input) {
        $out = new FieldCollection;
        foreach ($input as $field)
            $out[] = (object)['name' => $field->name,
                              'friendlyName' => $field->friendlyName,
                              'dataType' => $field->dataType,
                              'widget' => new FieldSetting(
                                  $field->widget->name,
                                  $field->widget->args ?? null
                              ),
                              'defaultValue' => $field->defaultValue ?? ''];
        return $out;
    }
}
