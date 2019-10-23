<?php

namespace RadCms\Installer;

use RadCms\Framework\Db;
use RadCms\Common\LoggerAccess;
use RadCms\Framework\FileSystemInterface;
use RadCms\ContentType\ContentTypeMigrator;
use RadCms\ContentType\ContentTypeCollection;

class Installer {
    private $sitePath;
    private $fs;
    private $db;
    private $makeDb;
    /**
     * @param string $sitePath
     * @param \RadCms\Framework\FileSystemInterface $fs
     * @param callable $makeDb = function ($c) { return new \RadCms\Framework\Db($c); }
     */
    public function __construct($sitePath,
                                FileSystemInterface $fs,
                                callable $makeDb = null) {
        $this->sitePath = $sitePath;
        $this->fs = $fs;
        $this->db = null;
        $this->makeDb = $makeDb ?? function ($c) { return new Db($c); };
    }
    /**
     * @param object $settings
     * @return string 'ok' | 'Some error message'
     */
    public function doInstall($settings) {
        if (($error = $this->openDbAndCreateSchema($settings)) ||
            ($error = $this->createSampleContentTypes($settings)) ||
            ($error = $this->insertWebsiteAndSampleContent($settings)) ||
            ($error = $this->cloneSampleContentTemplateFiles($settings)) ||
            ($error = $this->generateConfigFile($settings))) {
            return $error;
        }
        return 'ok';
    }
    /**
     * @param object $s settings
     * @return string|null
     */
    private function openDbAndCreateSchema($s) {
        try {
            $this->db = call_user_func($this->makeDb, [
                'db.host'        => $s->dbHost,
                'db.database'    => '',
                'db.user'        => $s->dbUser,
                'db.pass'        => $s->dbPass,
                'db.tablePrefix' => $s->dbTablePrefix,
                'db.charset'     => $s->dbCharset,
            ]);
        } catch (\PDOException $e) {
            LoggerAccess::getLogger()->log('error', $e->getMessage());
            return 'Failed to connect to the database';
        }
        try {
            $this->db->attr(\PDO::ATTR_EMULATE_PREPARES, 1);
            $this->db->exec('CREATE DATABASE ' . $s->dbDatabase);
        } catch (\PDOException $e) {
            LoggerAccess::getLogger()->log('error', $e->getMessage());
            return 'Failed to create the database';
        }
        try {
            $sql = $this->fs->read("{$s->radPath}schema.mariadb.sql");
            if (!$sql) return "Failed to read {$s->radPath}schema.mariadb.sql}";
            $sql = str_replace('${database}', $s->dbDatabase, $sql);
            $sql = str_replace('${siteName}', $s->siteName, $sql);
            $this->db->exec($sql);
            $this->db->attr(\PDO::ATTR_EMULATE_PREPARES, 0);
        } catch (\PDOException $e) {
            LoggerAccess::getLogger()->log('error', $e->getMessage());
            return 'Failed to insert sample content';
        }
        return null;
    }
    /**
     * @param object $s settings
     * @return string|null
     */
    private function createSampleContentTypes($s) {
        $path = "{$s->radPath}sample-content/{$s->sampleContent}/content-types.json";
        if (!($json = $this->fs->read($path)))
            return 'Failed to read ' . $path;
        if (!($contentTypesInput = json_decode($json, true)))
            return 'Failed to parse ' . $path;
        //
        $contentTypes = new ContentTypeCollection();
        foreach ($contentTypesInput as $type) $contentTypes->add(
            $type['name'] ?? '',
            $type['friendlyName'] ?? '',
            $type['fields'] ?? ''
        );
        try {
            (new ContentTypeMigrator($this->db))->installMany($contentTypes);
        } catch (\RuntimeException | \PDOException $e) {
            LoggerAccess::getLogger()->log('error', $e->getMessage());
            return 'Failed to create sample content types';
        }
        return null;
    }
    /**
     * @param object $s settings
     * @return string|null
     */
    private function insertWebsiteAndSampleContent($s) {
        $path = "{$s->radPath}sample-content/{$s->sampleContent}/sample-data.sql";
        $sql = $this->fs->read($path);
        if (!$sql) return "Failed to read {$path}";
        try {
            $this->db->exec($sql);
        } catch (\PDOException $e) {
            LoggerAccess::getLogger()->log('error', $e->getMessage());
            return 'Failed to insert sample content';
        }
        return null;
    }
    /**
     * @param object $s settings
     * @return string|null
     */
    private function cloneSampleContentTemplateFiles($s) {
        $dirPath = "{$s->radPath}sample-content/{$s->sampleContent}/";
        $dirPathLen = mb_strlen($dirPath);
        $fileNames = array_map(function ($filePath) use ($dirPathLen) {
            return substr($filePath, $dirPathLen);
        }, $this->fs->readDir($dirPath, '*.tmpl.php'));
        //
        foreach ($fileNames as $fileName) {
            if (!$this->fs->copy($dirPath . $fileName,
                                 $this->sitePath . $fileName)) {
                return 'Failed to write ' . $this->sitePath . $fileName;
            }
        }
        return null;
    }
    /**
     * @param object $s settings
     * @return string|null
     */
    private function generateConfigFile($s) {
        return $this->fs->write(
            $this->sitePath . 'config.php',
"<?php
if (!defined('RAD_BASE_PATH')) {
define('RAD_BASE_URL',  '{$s->baseUrl}');
define('RAD_QUERY_VAR', '{$s->mainQueryVar}');
define('RAD_BASE_PATH', '{$s->radPath}');
define('RAD_SITE_PATH', '{$this->sitePath}');
}
return [
    'db.host'        => '{$s->dbHost}',
    'db.database'    => '{$s->dbDatabase}',
    'db.user'        => '{$s->dbUser}',
    'db.pass'        => '{$s->dbPass}',
    'db.tablePrefix' => '{$s->dbTablePrefix}',
    'db.charset'     => '{$s->dbCharset}',
];
"
        ) ? null : 'Failed to generate config.php';
    }
}
