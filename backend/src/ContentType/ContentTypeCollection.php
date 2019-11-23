<?php

namespace RadCms\ContentType;

use RadCms\Framework\GenericArray;
use RadCms\Framework\Translator;

class ContentTypeCollection extends GenericArray {
    /**
     * ...
     */
    public function __construct() {
        parent::__construct(ContentTypeDef::class);
    }
    /**
     * @param string $origin
     * @param \RadCms\Framework\Translator $translator = null
     * @return array see self::fromCompactForm()
     */
    public function toCompactForm($origin, Translator $translator = null) {
        $out = [];
        foreach ($this->toArray() as $t)
            $out[$t->name] = [!$translator ? $t->friendlyName : $translator->t($t->name),
                              $t->fields->toCompactForm($translator),
                              $origin];
        return $out;
    }

    ////////////////////////////////////////////////////////////////////////////

    /**
     * @param array $compactCtypes ['name' => ['friendlyName', <compactFields>, 'origin'] ...]
     * @return \RadCms\ContentType\ContentTypeCollection
     */
    public static function fromCompactForm($compactCtypes) {
        $out = new ContentTypeCollection(ContentTypeDef::class);
        foreach ($compactCtypes as $ctypeName => $remainingArgs)
            $out->add(new ContentTypeDef($ctypeName,
                                         $remainingArgs[0],
                                         $remainingArgs[1],
                                         $remainingArgs[2] ?? 'site.json'));
        return $out;
    }
}
