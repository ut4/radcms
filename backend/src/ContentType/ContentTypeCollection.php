<?php

namespace RadCms\ContentType;

use Pike\Translator;

class ContentTypeCollection extends \ArrayObject {
    /**
     * @param string $name
     * @param string $friendlyName
     * @param array|\stdClass|\RadCms\ContentType\FieldCollection $fields ['fieldName' => 'dataType:widget', 'another' => 'dataType'...]
     * @param bool $isInternal = false
     * @param string $origin = 'site.json' 'site.json' | 'SomePlugin.json'
     */
    public function add($name,
                        $friendlyName,
                        $fields,
                        $isInternal = false,
                        $origin = 'site.json') {
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
            $n = !$t->isInternal ? '' : ':internal';
            $out[$t->name . $n] = [!$translator ? $t->friendlyName : $translator->t($t->name),
                                   $t->fields->toCompactForm($translator),
                                   $origin];
        }
        return $out;
    }
    /**
     * @param string $origin
     * @param \Pike\Translator $translator = null
     * @return array see self::fromCompactForm()
     */
    public function filterByKey($origin, Translator $translator = null) {
        $out = [];
        foreach ($this as $t) {
            $n = !$t->isInternal ? '' : ':internal';
            $out[$t->name . $n] = [!$translator ? $t->friendlyName : $translator->t($t->name),
                                   $t->fields->toCompactForm($translator),
                                   $origin];
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
                                        $remainingArgs[2] ?? 'site.json');
        }
        return $out;
    }
}
