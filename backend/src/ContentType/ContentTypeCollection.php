<?php

declare(strict_types=1);

namespace RadCms\ContentType;

use Pike\Translator;

class ContentTypeCollection extends \ArrayObject {
    /**
     * @param string $name
     * @param string $friendlyName
     * @param string $description
     * @param array|\RadCms\ContentType\FieldCollection $fields
     * @param bool $isInternal = false
     * @param string $frontendFormImpl = 'Default'
     * @param string $origin = null 'Website' | 'SomePlugin'
     */
    public function add(string $name,
                        string $friendlyName,
                        string $description,
                        $fields,
                        bool $isInternal = false,
                        string $frontendFormImpl = 'Default',
                        string $origin = null): void {
        $this[] = new ContentTypeDef($name,
                                     $friendlyName,
                                     $description,
                                     $fields,
                                     count($this),
                                     $isInternal,
                                     $frontendFormImpl,
                                     $origin);
    }
    /**
     * @param string $origin = null
     * @param \Pike\Translator $translator = null
     * @return array see self::fromCompactForm()
     */
    public function toCompactForm(string $origin = null,
                                  Translator $translator = null): array {
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
    public static function fromCompactForm(array $input): ContentTypeCollection {
        $out = new ContentTypeCollection;
        foreach ($input as $i => $def)
            $out[] = ContentTypeDef::fromObject($def, $i);
        return $out;
    }
    /**
     * @return \RadCms\ContentType\ContentTypeCollectionBuilder
     */
    public static function build(): ContentTypeCollectionBuilder {
        return new ContentTypeCollectionBuilder;
    }
}
