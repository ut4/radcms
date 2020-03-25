<?php

namespace RadCms\Tests\_Internal;

use Pike\ArrayUtils;

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
        $row = self::$db->fetchOne('SELECT `installedContentTypes` FROM ${p}cmsState');
        if (!$row || !strlen($row['installedContentTypes'] ?? ''))
            throw new \RuntimeException('Failed to fetch cmsState.`installedContentTypes`');
        if (($parsed = json_decode($row['installedContentTypes'])) === null)
            throw new \RuntimeException('Failed to parse cmsState.`installedContentTypes`');
        if (is_object($parsed))
            $parsed = (array) $parsed;
        if ($isInstalled)
            $this->assertNotNull(ArrayUtils::findByKey($parsed, $contentTypeName, 'name'));
        else
            $this->assertNull(ArrayUtils::findByKey($parsed, $contentTypeName, 'name'));
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
    public static function clearInstalledContentTypesFromDb($clearRevisions = true) {
        self::$db->exec('UPDATE ${p}cmsState SET' .
                        ' `installedContentTypes` = \'{}\'' .
                        ', `installedContentTypesLastUpdated` = NULL');
        if ($clearRevisions)
            self::$db->exec('DELETE FROM ${p}contentRevisions');
    }
}
