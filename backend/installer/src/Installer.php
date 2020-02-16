<?php

namespace RadCms\Installer;

use Pike\Db;
use Pike\FileSystem;
use Pike\FileSystemInterface;
use RadCms\ContentType\ContentTypeMigrator;
use RadCms\Website\SiteConfig;
use Pike\PikeException;
use RadCms\Packager\Packager;
use RadCms\Packager\PackageStreamInterface;
use Pike\Auth\Crypto;
use RadCms\Auth\ACL;

class Installer {
    private $db;
    private $fs;
    private $crypto;
    private $backendPath;
    private $siteDirPath;
    private $warnings;
    /**
     * @param \Pike\Db $db
     * @param \Pike\FileSystemInterface $fs
     * @param \Pike\Auth\Crypto $crypto
     * @param string $siteDirPath = INDEX_DIR_PATH Absoluuttinen polku kansioon, jossa sijaitsee index|install.php.
     */
    public function __construct(Db $db,
                                FileSystemInterface $fs,
                                Crypto $crypto,
                                $siteDirPath = INDEX_DIR_PATH) {
        $this->db = $db;
        $this->fs = $fs;
        $this->crypto = $crypto;
        $this->backendPath = FileSystem::normalizePath(dirname(__DIR__, 2)) . '/';
        $this->siteDirPath = FileSystem::normalizePath($siteDirPath) . '/';
        $this->warnings = [];
    }
    /**
     * @param object $settings Validoitu ja normalisoitu $req->body.
     * @return bool
     * @throws \Pike\PikeException
     */
    public function doInstall($settings) {
        $base = "{$this->backendPath}installer/sample-content/{$settings->sampleContent}/";
        // @allow \Pike\PikeException
        return $this->createDb($settings) &&
               $this->createMainSchema($settings) &&
               $this->insertMainSchemaData($settings) &&
               $this->createUserZero($settings) &&
               $this->createContentTypesAndInsertInitialData("{$base}site.json",
                                                             "{$base}sample-data.json",
                                                             $this->fs) &&
               $this->copyFiles($settings) &&
               $this->generateConfigFile($settings) &&
               $this->selfDestruct();
    }
    /**
     * @param \RadCms\Packager\PackageStreamInterface $package
     * @param string $packageFilePath '/path/to/tmp/uploaded-package-file.zip'
     * @param string $unlockKey
     * @return bool
     * @throws \Pike\PikeException
     */
    public function doInstallFromPackage(PackageStreamInterface $package,
                                         $packageFilePath,
                                         $unlockKey) {
        // <packagereader>
        if (!($signed = $this->fs->read($packageFilePath)))
            throw new PikeException('Failed to read package file contents',
                                    PikeException::BAD_INPUT);
        $unlocked = $this->crypto->decrypt($signed, $unlockKey);
        // @allow \Pike\PikeException
        $package->open($unlocked);
        if (!($json1 = $package->read(Packager::DB_CONFIG_VIRTUAL_FILE_NAME)) ||
            ($dbSettings = json_decode($json1, true)) === null)
                throw new PikeException('Failed to parse data',
                                        PikeException::BAD_INPUT);
        if (!($json2 = $package->read(Packager::WEBSITE_STATE_VIRTUAL_FILE_NAME)) ||
            ($siteSettings = json_decode($json2, true)) === null)
                throw new PikeException('Failed to parse data',
                                        PikeException::BAD_INPUT);
        // </packagereader>
        //
        $settings = (object)array_merge($dbSettings, $siteSettings);
        return $this->createDb($settings) &&
               $this->createMainSchema($settings) &&
               $this->insertMainSchemaData($settings) &&
               $this->createContentTypesAndInsertInitialData(
                    Packager::WEBSITE_CONFIG_VIRTUAL_FILE_NAME,
                    Packager::THEME_CONTENT_DATA_VIRTUAL_FILE_NAME,
                    $package);
    }
    /**
     * @return array
     */
    public function getWarnings() {
        return $this->warnings;
    }
    /**
     * @param object $s settings
     * @return bool
     * @throws \Pike\PikeException
     */
    private function createDb($s) {
        try {
            $this->db->setConfig([
                'db.host'        => $s->dbHost,
                'db.database'    => '',
                'db.user'        => $s->dbUser,
                'db.pass'        => $s->dbPass,
                'db.tablePrefix' => $s->dbTablePrefix,
                'db.charset'     => $s->dbCharset,
            ]);
            $this->db->open();
        } catch (\PDOException $e) {
            throw new PikeException($e->getMessage(), PikeException::FAILED_DB_OP);
        }
        try {
            $this->db->attr(\PDO::ATTR_EMULATE_PREPARES, 1);
            $this->db->exec("CREATE DATABASE {$s->dbDatabase}");
        } catch (\PDOException $e) {
            throw new PikeException($e->getMessage(), PikeException::FAILED_DB_OP);
        }
        return true;
    }
    /**
     * @param object $s settings
     * @return bool
     * @throws \Pike\PikeException
     */
    private function createMainSchema($s) {
        try {
            $sql = $this->fs->read("{$this->backendPath}installer/schema.mariadb.sql");
            if (!$sql)
                throw new PikeException("Failed to read `{$this->backendPath}installer/schema.mariadb.sql`",
                                        PikeException::FAILED_FS_OP);
            $this->db->exec(str_replace('${database}', $s->dbDatabase, $sql));
            $this->db->attr(\PDO::ATTR_EMULATE_PREPARES, 0);
        } catch (\PDOException $e) {
            throw new PikeException($e->getMessage(), PikeException::FAILED_DB_OP);
        }
        return true;
    }
    /**
     * @param object $s settings
     * @return bool
     * @throws \Pike\PikeException
     */
    private function insertMainSchemaData($s) {
        try {
            if ($this->db->exec('INSERT INTO ${p}websiteState VALUES (1,?,?,?,?,?,?)',
                                [
                                    $s->siteName,
                                    $s->siteLang,
                                    $s->installedContentTypes ?? '{}',
                                    $s->installedContentTypesLastUpdated ?? null,
                                    $s->installedPlugins ?? '{}',
                                    $s->aclRules ?? '{}',
                                ]) !== 1)
                throw new PikeException('Failed to insert main schema data',
                                        PikeException::INEFFECTUAL_DB_OP);
        } catch (\PDOException $e) {
            throw new PikeException($e->getMessage(), PikeException::FAILED_DB_OP);
        }
        return true;
    }
    /**
     * @param object $s settings
     * @return bool
     * @throws \Pike\PikeException
     */
    private function createUserZero($s) {
        try {
            if ($this->db->exec('INSERT INTO ${p}users'.
                                ' (`id`,`username`,`email`,`passwordHash`,`role`)' .
                                ' VALUES (?,?,?,?,?)',
                                [
                                    $this->crypto->guidv4(),
                                    $s->firstUserName,
                                    $s->firstUserEmail ?? '',
                                    $this->crypto->hashPass($s->firstUserPass),
                                    ACL::ROLE_SUPER_ADMIN
                                ]) !== 1)
                throw new PikeException('Failed to insert user zero',
                                        PikeException::INEFFECTUAL_DB_OP);
        } catch (\PDOException $e) {
            throw new PikeException($e->getMessage(), PikeException::FAILED_DB_OP);
        }
        return true;
    }
    /**
     * @param string $siteConfigFilePath '/path/to/site/site.json'
     * @param string $dataFilePath '/path/to/site/sample-content.json'
     * @param \Pike\FileSystemInterface $fs
     * @return bool
     * @throws \Pike\PikeException
     */
    private function createContentTypesAndInsertInitialData($siteCfgFilePath,
                                                            $dataFilePath,
                                                            $fs) {
        $json = $fs->read($dataFilePath);
        if (!$json)
            throw new PikeException("Failed to read `{$dataFilePath}`", PikeException::FAILED_FS_OP);
        if (($initialData = json_decode($json)) === null)
            throw new PikeException("Failed to parse `{$dataFilePath}`", PikeException::FAILED_FS_OP);
        //
        $cfg = new SiteConfig($fs);
        // @allow \Pike\PikeException
        return $cfg->selfLoad($siteCfgFilePath, false, true) &&
               (new ContentTypeMigrator($this->db))->installMany($cfg->contentTypes,
                                                                 $initialData);
    }
    /**
     * @param object $s settings
     * @return bool
     * @throws \Pike\PikeException
     */
    private function copyFiles($s) {
        //
        foreach ([$this->siteDirPath . 'uploads',
                  $this->siteDirPath . 'theme'] as $path) {
            if (!$this->fs->isDir($path) && !$this->fs->mkDir($path))
                throw new PikeException("Failed to create `{$path}`",
                                        PikeException::FAILED_FS_OP);
        }
        //
        $base = "{$this->backendPath}installer/sample-content/{$s->sampleContent}/";
        // @allow \Pike\PikeException
        $tmplFileNames = $this->readDirFileNames("{$base}theme/", '*.tmpl.php');
        $assetFileNames = $this->readDirFileNames("{$base}theme/frontend/", '*.{css,js}',
                                                  GLOB_ERR | GLOB_BRACE);
        //
        $toBeCopied = [];
        foreach (['site.json', 'README.md'] as $fileName)
            $toBeCopied[] = ["{$base}{$fileName}",
                             "{$this->siteDirPath}{$fileName}"];
        foreach ($tmplFileNames as $fileName)
            $toBeCopied[] = ["{$base}theme/{$fileName}",
                             "{$this->siteDirPath}theme/{$fileName}"];
        foreach ($assetFileNames as $fileName)
            $toBeCopied[] = ["{$base}theme/frontend/{$fileName}",
                             "{$this->siteDirPath}theme/{$fileName}"];
        //
        foreach ($toBeCopied as [$from, $to]) {
            if (!$this->fs->copy($from, $to))
                throw new PikeException("Failed to copy `{$from}` -> `{$to}`",
                                        PikeException::FAILED_FS_OP);
        }
        return true;
    }
    /**
     * @param object $s settings
     * @return bool
     * @throws \Pike\PikeException
     */
    private function generateConfigFile($s) {
        $flags = $s->useDevMode ? 'RAD_DEVMODE' : '0';
        if ($this->fs->write(
            "{$this->siteDirPath}config.php",
"<?php
if (!defined('RAD_BASE_PATH')) {
    define('RAD_BASE_URL',       '{$s->baseUrl}');
    define('RAD_QUERY_VAR',      '{$s->mainQueryVar}');
    define('RAD_BASE_PATH',      '{$this->backendPath}');
    define('RAD_SITE_PATH',      '{$this->siteDirPath}');
    define('RAD_DEVMODE',        1 << 1);
    define('RAD_USE_JS_MODULES', 1 << 2);
    define('RAD_FLAGS',          {$flags});
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
        throw new PikeException("Failed to generate `{$this->siteDirPath}config.php`",
                                PikeException::FAILED_FS_OP);
    }
    /**
     * @return string[] ['file.php', 'another.php']
     * @throws \Pike\PikeException
     */
    private function readDirFileNames($dirPath, $globPattern, $globFlags = GLOB_ERR) {
        if (($paths = $this->fs->readDir($dirPath, $globPattern, $globFlags))) {
            return array_map(function ($fullFilePath) use ($dirPath) {
                return substr($fullFilePath, mb_strlen($dirPath));
            }, $paths);
        }
        throw new PikeException("Failed to read `{$dirPath}${$globPattern}`",
                                PikeException::FAILED_FS_OP);
    }
    /**
     * @return bool
     * @throws \Pike\PikeException
     */
    private function selfDestruct() {
        foreach ([
            'install.php',
            'frontend/install-app.css',
            'frontend/rad-install-app.js'
        ] as $p) {
            if (!$this->fs->unlink("{$this->siteDirPath}${p}"))
                $this->warnings[] = "Failed to remove `{$this->siteDirPath}${p}`";
        }
        //
        $installerDirPath = "{$this->backendPath}installer";
        if (($failedEntry = $this->deleteFilesRecursive($installerDirPath)) ||
            $this->fs->isDir($installerDirPath)) {
            $this->warnings[] = 'Failed to remove installer-files `' .
                                $installerDirPath . '/*`' . ($failedEntry
                                ? " ({$failedEntry})" : '');
        }
        return true;
    }
    /**
     * @return null|string null = ok, string = failedDirOrFilePath
     */
    private function deleteFilesRecursive($dirPath) {
        foreach ($this->fs->readDir($dirPath) as $path) {
            if ($this->fs->isFile($path)) {
                if (!$this->fs->unlink($path)) return $path;
            } elseif (($failedItem = $this->deleteFilesRecursive($path))) {
                return $failedItem;
            }
        }
        return $this->fs->rmDir($dirPath) ? null : $dirPath;
    }
}
