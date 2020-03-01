<?php

namespace RadCms\ContentType;

use Pike\Translator;

/**
 * ContentTypeDef->fields.
 */
class FieldCollection extends \ArrayObject implements \JsonSerializable {
    /**
     * @param \Closure $formatterFn = null fn(\RadCms\ContentType\FieldDef $field): string
     * @return string '`name`, `name2`'
     */
    public function toSqlCols($formatterFn = null) {
        $names = [];
        foreach ($this as $f)
            $names[] = $f->toSqlCol($formatterFn);
        return implode(', ', $names);
    }
    /**
     * @return string '`name` TEXT, `name2` INT UNSIGNED'
     */
    public function toSqlTableFields() {
        $fields = [];
        foreach ($this as $f)
            $fields[] = $f->toSqlTableField();
        return implode(', ', $fields);
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
            $out[] = new FieldDef($name,
                                  $remainingArgs[1] ?? $name, // friendlyName
                                  $remainingArgs[0],          // dataType
                                  !isset($remainingArgs[2])   // widget
                                      ? $DEFAULT_WIDGET
                                      : FieldSetting::fromCompactForm($remainingArgs[2]),
                                  $remainingArgs[3] ?? '');   // defaultValue
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
            $out[] = FieldDef::fromObject($field);
        return $out;
    }
}
