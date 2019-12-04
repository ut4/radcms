<?php

namespace RadCms\Tests\Self;

trait ContentTestUtils {
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
    public function insertContent($contentTypeName, $data) {
        $ownData = $data[0];
        $defaults = $data[1] ?? [];
        $ownDataQs = implode('', array_fill(0, count($ownData), ',?'));
        $id = $defaults[0];
        $isPublished = $defaults[1] ?? 1;
        if (self::$db->exec('INSERT INTO ${p}' . $contentTypeName .
                            ' VALUES (?,?' . $ownDataQs . ')',
                            array_merge([$id, (int)$isPublished], $ownData)) < 1)
            throw new \RuntimeException('Failed to insert test data');
    }
    public function deleteContent($contentTypeName) {
        if (self::$db->exec('DELETE FROM ${p}' . $contentTypeName) < 1)
            throw new \RuntimeException('Failed to clean test data');
    }
}
