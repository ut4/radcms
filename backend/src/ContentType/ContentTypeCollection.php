<?php

namespace RadCms\ContentType;

use Pike\Translator;

class ContentTypeCollection extends \ArrayObject {
    /**
     * @param string $name
     * @param string $friendlyName
     * @param array|\stdClass|\RadCms\ContentType\FieldCollection $fields ['fieldName' => 'dataType:widget', 'another' => 'dataType'...]
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
                                     $isInternal,
                                     $origin);
    }
    /**
     * @param string $origin
     * @param \Pike\Translator $translator = null
     * @return array see self::fromCompactForm()
     */
    public function toCompactForm($origin, Translator $translator = null) {
        $out = [];
        foreach ($this as $t) {
            $compacted = $t->toCompactForm($origin, $translator);
            $out[$compacted->key] = $compacted->definition;
        }
        return $out;
    }

    ////////////////////////////////////////////////////////////////////////////

    /**
     * @param array $compactCtypes ['name' => ['friendlyName', <compactFields>, 'origin'] ...]
     * @return \RadCms\ContentType\ContentTypeCollection
     */
    public static function fromCompactForm($compactCtypes) {
        $out = new ContentTypeCollection;
        foreach ($compactCtypes as $ctypeName => $remainingArgs) {
            $pcs = explode(':', $ctypeName);
            $out[] = new ContentTypeDef($pcs[0],
                                        $remainingArgs[0],
                                        $remainingArgs[1],
                                        ($pcs[1] ?? '') === 'internal',
                                        $remainingArgs[2] ?? null);
        }
        return $out;
    }
}
