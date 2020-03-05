<?php

namespace RadCms\Tests\_Internal;

trait ContentTestUtils {
    /**
     * @param string $contentTypeName
     * @param bool $shouldExist
     */
    public function verifyContentTypeTableExists($contentTypeName,
                                                 $shouldExist) {
        $info = self::$db->fetchOne(
            'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES' .
            ' WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
            [self::$db->getCurrentDatabaseName(),
             self::$db->getTablePrefix() . $contentTypeName]
        );
        if ($shouldExist)
            $this->assertIsArray($info, "Content type {$contentTypeName} should exist.");
        else
            $this->assertIsNotArray($info, "Content type {$contentTypeName} should not exist.");
    }
    /**
     * @param string $contentTypeName
     * @param bool $isInstalled
     * @param bool $verifyTableExists = true
     */
    public function verifyContentTypeIsInstalled($contentTypeName,
                                                 $isInstalled,
                                                 $verifyTableExists = true) {
        if ($verifyTableExists) {
            $this->verifyContentTypeTableExists($contentTypeName, true);
        }
        $this->assertEquals(intval($isInstalled), self::$db->fetchOne(
            'SELECT JSON_CONTAINS_PATH(`installedContentTypes`, \'one\',' .
            ' ?) as `containsKey` FROM ${p}cmsState',
            ['$."' . $contentTypeName . '"']
        )['containsKey']);
    }
    public function insertContent($contentTypeName, ...$data) {
        $qGroups = [];
        $vals = [];
        foreach ($data as $item) {
            $ownData = $item[0];
            $defaults = $item[1] ?? [1];
            $qGroups[] = '(?,?' . implode('', array_fill(0, count($ownData), ',?')) . ')';
            //
            $id = $defaults[0];
            $isPublished = $defaults[1] ?? 1;
            array_push($vals, $id, $isPublished, ...$ownData);
        }
        if (self::$db->exec('INSERT INTO ${p}' . $contentTypeName .
                            ' VALUES ' . implode(',', $qGroups),
                            $vals) < 1)
            throw new \RuntimeException('Failed to insert test data');

    }
    public function insertRevision($contentId, $contentTypeName, $dataSnapShot='{"foo":"bar"}') {
        if (self::$db->exec('INSERT INTO ${p}contentRevisions VALUES (?,?,?,?)',
                            [$contentId, $contentTypeName, $dataSnapShot, strval(time())]) < 1)
            throw new \Exception('Failed to insert test data');
    }
    public function deleteContent($contentTypeName) {
        if (self::$db->exec('DELETE FROM ${p}' . $contentTypeName) < 1)
            throw new \RuntimeException('Failed to clean test data');
    }
    public static function clearInstalledContentTypesFromDb() {
        self::$db->exec('UPDATE ${p}cmsState SET' .
                        ' `installedContentTypes` = \'{}\'' .
                        ', `installedContentTypesLastUpdated` = NULL');
    }
}
