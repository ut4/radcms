<?php

namespace RadCms\Installer;

use RadCms\Framework\Db;
use RadCms\Framework\FileSystemInterface;
use RadCms\ContentType\ContentTypeMigrator;
use RadCms\Website\SiteConfig;
use RadCms\Common\RadException;
use RadCms\Packager\Packager;
use RadCms\Packager\PackageStreamInterface;

class Installer {
    private $indexFilePath;
    private $fs;
    private $db;
    private $makeDb;
    /**
     * @param string $indexFilePath ks. InstallerApp::__construct
     * @param \RadCms\Framework\FileSystemInterface $fs
     * @param callable $makeDb = function ($c) { return new \RadCms\Framework\Db($c); }
     */
    public function __construct($indexFilePath,
                                FileSystemInterface $fs,
                                callable $makeDb = null) {
        $this->indexFilePath = $indexFilePath;
        $this->fs = $fs;
        $this->db = null;
        $this->makeDb = $makeDb ?? function ($c) { return new Db($c); };
    }
    /**
     * @param object $settings Validoitu ja normalisoitu $req->body.
     * @return bool
     * @throws \RadCms\Common\RadException
     */
    public function doInstall($settings) {
        // @allow \RadCms\Common\RadException
        return $this->createDb($settings) &&
               $this->createMainSchema($settings) &&
               $this->insertMainSchemaData($settings) &&
               $this->createSampleContentTypesAndInsertSampleContent($settings) &&
               $this->cloneTemplatesAndCfgFile($settings) &&
               $this->generateConfigFile($settings);
    }
    /**
     * @param \RadCms\Packager\PackageStreamInterface $package
     * @param string $packageFilePath '/path/to/tmp/uploaded-package-file.zip'
     * @return bool
     * @throws \RadCms\Common\RadException
     */
    public function doInstallFromPackage(PackageStreamInterface $package,
                                         $packageFilePath) {
        // @allow \RadCms\Common\RadException
        $package->open($packageFilePath);
        if (!($json1 = $package->read(Packager::DB_CONFIG_VIRTUAL_FILE_NAME)) ||
            ($dbSettings = json_decode($json1, true)) === null)
                throw new RadException('Failed to parse data',
                                       RadException::BAD_INPUT);
        if (!($json2 = $package->read(Packager::WEBSITE_STATE_VIRTUAL_FILE_NAME)) ||
            ($siteSettings = json_decode($json2, true)) === null)
                throw new RadException('Failed to parse data',
                                       RadException::BAD_INPUT);
        //
        $settings = (object)array_merge($dbSettings, $siteSettings);
        return $this->createDb($settings) &&
               $this->createMainSchema($settings) &&
               $this->insertMainSchemaData($settings);
    }
    /**
     * @param object $s settings
     * @return bool
     * @throws \RadCms\Common\RadException
     */
    private function createDb($s) {
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
        return true;
    }
    /**
     * @param object $s settings
     * @return bool
     * @throws \RadCms\Common\RadException
     */
    private function createMainSchema($s) {
        try {
            $sql = $this->fs->read("{$s->radPath}schema.mariadb.sql");
            if (!$sql)
                throw new RadException("Failed to read {$s->radPath}schema.mariadb.sql}",
                                       RadException::FAILED_FS_OP);
            $this->db->exec(str_replace('${database}', $s->dbDatabase, $sql));
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
    private function insertMainSchemaData($s) {
        try {
            if ($this->db->exec('INSERT INTO ${p}websiteState VALUES (1,?,?,?,?,?)',
                                [
                                    $s->siteName,
                                    $s->siteLang,
                                    $s->installedContentTypes ?? '{}',
                                    $s->installedContentTypesLastUpdated ?? null,
                                    $s->installedPlugins ?? '{}',
                                ]) < 1)
                throw new RadException('Failed to insert main schema data',
                                       RadException::INEFFECTUAL_DB_OP);
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
        if (!$this->fs->isDir($s->sitePath) && !$this->fs->mkDir($s->sitePath))
            throw new RadException('Failed to create ' . $s->sitePath,
                                   RadException::FAILED_FS_OP);
        //
        foreach ($fileNames as $fileName) {
            if (!$this->fs->copy($dirPath . $fileName,
                                 $s->sitePath . $fileName)) {
                throw new RadException('Failed to copy ' . $s->sitePath . $fileName,
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
        $flags = $s->useDevMode ? 'RAD_DEVMODE' : '0';
        if ($this->fs->write(
            $this->indexFilePath . 'config.php',
"<?php
if (!defined('RAD_BASE_PATH')) {
define('RAD_BASE_URL',   '{$s->baseUrl}');
define('RAD_QUERY_VAR',  '{$s->mainQueryVar}');
define('RAD_BASE_PATH',  '{$s->radPath}');
define('RAD_INDEX_PATH', '{$this->indexFilePath}');
define('RAD_SITE_PATH',  '{$s->sitePath}');
define('RAD_DEVMODE',    1 << 1);
define('RAD_FLAGS',      {$flags});
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
