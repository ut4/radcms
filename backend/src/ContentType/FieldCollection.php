<?php

declare(strict_types=1);

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
    public function toSqlCols(\Closure $formatterFn = null): string {
        $names = [];
        foreach ($this as $f)
            $names[] = $f->toSqlCol($formatterFn);
        return implode(', ', $names);
    }
    /**
     * @return string '`name` TEXT, `name2` INT UNSIGNED'
     */
    public function toSqlTableFields(): string {
        $fields = [];
        foreach ($this as $f)
            $fields[] = $f->toSqlTableField();
        return implode(', ', $fields);
    }
    /**
     * @param \Pike\Translator $translator = null
     * @return array see self::fromCompactForm()
     */
    public function toCompactForm(Translator $translator = null): array {
        $out = [];
        foreach ($this as $f)
            $out[] = (object) [
                'name' => $f->name,
                'dataType' => (object) $f->dataType,
                'friendlyName' => !$translator ? $f->friendlyName ?? $f->name : $translator->t($f->name),
                'widget' => $f->widget,
                'defaultValue' => $f->defaultValue ?? '',
                'visibility' => property_exists($f, 'visibility') ? (int) $f->visibility : 0,
            ];
        return $out;
    }
    /**
     * @return array
     */
    public function jsonSerialize(): array {
        return $this->getArrayCopy();
    }

    ////////////////////////////////////////////////////////////////////////////

    /**
     * @param \stdClass[] $input
     * @return \RadCms\ContentType\FieldCollection
     */
    public static function fromCompactForm(array $input): FieldCollection {
        $out = new FieldCollection;
        foreach ($input as $field)
            $out[] = FieldDef::fromObject($field);
        return $out;
    }
}
