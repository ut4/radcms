<?php

namespace RadCms\ContentType;

use Pike\GenericArray;
use Pike\Translator;

class ContentTypeCollection extends GenericArray {
    /**
     * ...
     */
    public function __construct() {
        parent::__construct(ContentTypeDef::class);
    }
    /**
     * @param string $origin
     * @param \Pike\Translator $translator = null
     * @return array see self::fromCompactForm()
     */
    public function toCompactForm($origin, Translator $translator = null) {
        $out = [];
        foreach ($this->toArray() as $t) {
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
        $out = new ContentTypeCollection(ContentTypeDef::class);
        foreach ($compactCtypes as $ctypeName => $remainingArgs) {
            $pcs = explode(':', $ctypeName);
            $out->add(new ContentTypeDef($pcs[0],
                                         $remainingArgs[0],
                                         $remainingArgs[1],
                                         ($pcs[1] ?? '') === 'internal',
                                         $remainingArgs[2] ?? 'site.json'));
        }
        return $out;
    }
}
