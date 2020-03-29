<?php

declare(strict_types=1);

namespace RadCms\Tests\_Internal;

use Pike\ArrayUtils;
use Pike\DbUtils;
use RadCms\Content\DAO;

trait ContentTestUtils {
    /**
     * @param string $contentTypeName
     * @param bool $shouldExist
     */
    public function verifyContentTypeTableExists(string $contentTypeName,
                                                 bool $shouldExist): void {
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
    public function verifyContentTypeIsInstalled(string $contentTypeName,
                                                 bool $isInstalled,
                                                 bool $verifyTableExists = true): void {
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
    /**
     * @param string $contentTypeName
     * @param array[] ...$nodes (..., ['id' => 1,
     *                                 'status' => DAO::STATUS_DRAFT,
     *                                 'ownField1' => 'foo',
     *                                 'ownField2' => 'bar'],
     *                                  ['id' => 2,
     *                                   'ownField1' => 'baz',
     *                                   'ownField2' => 'naz'],
     *                                  ...)
     */
    public function insertContent(string $contentTypeName, ...$nodes): void {
        $qGroups = [];
        $allVals = [];
        foreach ($nodes as $data) {
            [$qs, $vals, ] = DbUtils::makeInsertBinders(array_merge([
                'id' => $data['id'],
                'status' => $data['status'] ?? DAO::STATUS_PUBLISHED,
            ], $data));
            $qGroups[] = "({$qs})";
            $allVals = array_merge($allVals, $vals);
        }
        if (self::$db->exec('INSERT INTO ${p}' . $contentTypeName .
                            ' VALUES ' . implode(',', $qGroups),
                            $allVals) < 1)
            throw new \RuntimeException('Failed to insert test data');
    }
    /**
     * @param int $contentId
     * @param string $contentTypeName
     * @param string $dataSnapshot = '{"foo":"bar"}'
     */
    public function insertRevision(int $contentId,
                                   string $contentTypeName,
                                   string $dataSnapshot='{"foo":"bar"}'): void {
        if (self::$db->exec('INSERT INTO ${p}contentRevisions VALUES (?,?,?,?)',
                            [$contentId, $contentTypeName, $dataSnapshot, strval(time())]) < 1)
            throw new \Exception('Failed to insert test data');
    }
    /**
     * @param string $contentTypeName
     */
    public function deleteContent(string $contentTypeName): void {
        if (self::$db->exec('DELETE FROM ${p}' . $contentTypeName) < 1)
            throw new \RuntimeException('Failed to clean test data');
    }
    /**
     * @param bool $clearRevisions = true
     */
    public static function clearInstalledContentTypesFromDb(bool $clearRevisions = true): void {
        self::$db->exec('UPDATE ${p}cmsState SET' .
                        ' `installedContentTypes` = \'{}\'' .
                        ', `installedContentTypesLastUpdated` = NULL');
        if ($clearRevisions)
            self::$db->exec('DELETE FROM ${p}contentRevisions');
    }
}
