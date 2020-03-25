<?php

namespace RadCms\ContentType;

use Pike\Translator;

class ContentTypeCollection extends \ArrayObject {
    /**
     * @param string $name
     * @param string $friendlyName
     * @param array|\RadCms\ContentType\FieldCollection $fields
     * @param bool $isInternal = false
     * @param string $origin = null 'Website' | 'SomePlugin'
     */
    public function add($name,
                        $friendlyName,
                        $fields,
                        $isInternal = false,
                        $origin = null) {
        $this[] = new ContentTypeDef($name,
                                     $friendlyName,
                                     $fields,
                                     count($this),
                                     $isInternal,
                                     $origin);
    }
    /**
     * @param string $origin = null
     * @param \Pike\Translator $translator = null
     * @return array see self::fromCompactForm()
     */
    public function toCompactForm($origin = null, Translator $translator = null) {
        $out = [];
        foreach ($this as $t)
            $out[] = $t->toCompactForm($origin, $translator);
        return $out;
    }

    ////////////////////////////////////////////////////////////////////////////

    /**
     * @param array $input [{name: string, friendlyName: string, fields: array ...}]
     * @return \RadCms\ContentType\ContentTypeCollection
     */
    public static function fromCompactForm($input) {
        $out = new ContentTypeCollection;
        foreach ($input as $i => $def)
            $out[] = new ContentTypeDef($def->name,
                                        $def->friendlyName,
                                        $def->fields,
                                        $i,
                                        $def->isInternal ?? false,
                                        $def->origin ?? null);
        return $out;
    }
}
