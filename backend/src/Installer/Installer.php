<?php

namespace RadCms\Installer;

use RadCms\Framework\Db;
use RadCms\Framework\FileSystemInterface;
use RadCms\ContentType\ContentTypeMigrator;
use RadCms\Website\SiteConfig;
use RadCms\Common\RadException;

class Installer {
    private $sitePath;
    private $fs;
    private $db;
    private $makeDb;
    /**
     * @param string $sitePath ks. InstallerApp::__construct
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
        // @allow \RadCms\Common\RadException
        return $this->openDbAndCreateSchema($settings) &&
               $this->createSampleContentTypesAndInsertSampleContent($settings) &&
               $this->cloneTemplatesAndCfgFile($settings) &&
               $this->generateConfigFile($settings);
    }
    /**
     * @param object $s settings
     * @return bool
     * @throws \RadCms\Common\RadException
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
            throw new RadException($e->getMessage(), RadException::FAILED_DB_OP);
        }
        try {
            $this->db->attr(\PDO::ATTR_EMULATE_PREPARES, 1);
            $this->db->exec('CREATE DATABASE ' . $s->dbDatabase);
        } catch (\PDOException $e) {
            throw new RadException($e->getMessage(), RadException::FAILED_DB_OP);
        }
        try {
            $sql = $this->fs->read("{$s->radPath}schema.mariadb.sql");
            if (!$sql)
                throw new RadException("Failed to read {$s->radPath}schema.mariadb.sql}",
                                       RadException::FAILED_FS_OP);
            $sql = str_replace('${database}', $s->dbDatabase, $sql);
            $sql = str_replace('${siteName}', $s->siteName, $sql);
            $this->db->exec($sql);
            $this->db->attr(\PDO::ATTR_EMULATE_PREPARES, 0);
        } catch (\PDOException $e) {
            throw new RadException($e->getMessage(), RadException::FAILED_DB_OP);
        }
        return true;
    }
    /**
     * @param object $s settings
     * @return bool
     * @throws \RadCms\Common\RadException
     */
    private function createSampleContentTypesAndInsertSampleContent($s) {
        $path = "{$s->radPath}sample-content/{$s->sampleContent}/sample-data.json";
        $json = $this->fs->read($path);
        if (!$json)
            throw new RadException("Failed to read {$path}", RadException::FAILED_FS_OP);
        if (($sampleContent = json_decode($json)) === null)
            throw new RadException("Failed to parse {$path}", RadException::FAILED_FS_OP);
        //
        $cfg = new SiteConfig($this->fs);
        // @allow \RadCms\Common\RadException
        return $cfg->selfLoad("{$s->radPath}sample-content/{$s->sampleContent}/site.ini", false, false) &&
               (new ContentTypeMigrator($this->db))->installMany($cfg->contentTypes,
                                                                 $sampleContent);
    }
    /**
     * @param object $s settings
     * @return bool
     * @throws \RadCms\Common\RadException
     */
    private function cloneTemplatesAndCfgFile($s) {
        $dirPath = "{$s->radPath}sample-content/{$s->sampleContent}/";
        $dirPathLen = mb_strlen($dirPath);
        //
        $fileNames = ['site.ini'];
        if (!($filePaths = $this->fs->readDir($dirPath, '*.tmpl.php')))
            throw new RadException("Failed to read {$dirPath}",
                                   RadException::FAILED_FS_OP);
        foreach ($filePaths as $path) {
            $fileNames[] = substr($path, $dirPathLen);
        }
        //
        foreach ($fileNames as $fileName) {
            if (!$this->fs->copy($dirPath . $fileName,
                                 $this->sitePath . $fileName)) {
                throw new RadException('Failed to copy ' . $this->sitePath . $fileName,
                                       RadException::FAILED_FS_OP);
            }
        }
        return true;
    }
    /**
     * @param object $s settings
     * @return bool
     * @throws \RadCms\Common\RadException
     */
    private function generateConfigFile($s) {
        if ($this->fs->write(
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
        )) return true;
        throw new RadException('Failed to generate config.php',
                               RadException::FAILED_FS_OP);
    }
}
