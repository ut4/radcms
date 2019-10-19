<?php

namespace RadCms\ContentType;

use RadCms\Framework\GenericArray;
use RadCms\Framework\Db;

class ContentTypeCollection extends GenericArray {
    /**
     * .
     */
    public function __construct() {
        parent::__construct(ContentTypeDef::class);
    }
    /**
     * \RadCms\Framework\Db $db = unll
     */
    public function populateFromDb(Db $db = null) {
        $row = $db->fetchOne('select `activeContentTypes` from ${p}websiteState');
        if (!$row || !($parsed = json_decode($row['activeContentTypes'], true)))
            throw new \InvalidArgumentException('Invalid dbResult');
        foreach ($parsed as $ctypeName => $remainingArgs) {
            $this->add($ctypeName, ...$remainingArgs);
        }
    }
}
