<?php

namespace RadCms\Tests\Self;

trait ContentTypeDbTestUtils {
    /**
     * @param string $contentTypeName
     * @param bool $isInstalled
     * @param \RadCms\Framework\Db $db
     * @param bool $verifyTableExists = true
     */
    public function verifyContentTypeIsInstalled($contentTypeName,
                                                 $isInstalled,
                                                 $db,
                                                 $verifyTableExists = true) {
        if ($verifyTableExists) {
            $this->assertEquals(intval($isInstalled), count($db->fetchAll(
                'SELECT `table_name` FROM information_schema.tables' .
                ' WHERE `table_schema` = ? AND `table_name` = ?',
                [$db->database, $db->tablePrefix . $contentTypeName]
            )));
        }
        $this->assertEquals(intval($isInstalled), self::$db->fetchOne(
            'SELECT JSON_CONTAINS_PATH(`installedContentTypes`, \'one\',' .
            ' ?) as `containsKey` FROM ${p}websiteState',
            ['$."' . $contentTypeName . '"']
        )['containsKey']);
    }
}
