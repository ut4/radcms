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

class Installer {
    private $db;
    private $fs;
    private $backendPath;
    private $siteDirPath;
    private $warnings;
    /**
     * @param \Pike\Db $db
     * @param \Pike\FileSystemInterface $fs
     * @param string $siteDirPath = INDEX_DIR_PATH Absoluuttinen polku kansioon, jossa sijaitsee index|install.php.
     */
    public function __construct(Db $db,
                                FileSystemInterface $fs,
                                $siteDirPath = INDEX_DIR_PATH) {
        $this->db = $db;
        $this->fs = $fs;
        $this->backendPath = FileSystem::normalizePath(dirname(__DIR__, 2));
        $this->siteDirPath = FileSystem::normalizePath($siteDirPath);
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
               $this->createContentTypesAndInsertInitialData("{$base}site.json",
                                                             "{$base}sample-data.json",
                                                             $this->fs) &&
               $this->cloneTemplatesAndCfgFile($settings) &&
               $this->generateConfigFile($settings) &&
               $this->selfDestruct();
    }
    /**
     * @param \RadCms\Packager\PackageStreamInterface $package
     * @param string $packageFilePath '/path/to/tmp/uploaded-package-file.zip'
     * @param string $unlockKey
     * @param \Pike\Auth\Crypto $crypto
     * @return bool
     * @throws \Pike\PikeException
     */
    public function doInstallFromPackage(PackageStreamInterface $package,
                                         $packageFilePath,
                                         $unlockKey,
                                         Crypto $crypto) {
        // <packagereader>
        if (!($signed = $this->fs->read($packageFilePath)))
            throw new PikeException('Failed to read package file contents',
                                    PikeException::BAD_INPUT);
        $unlocked = $crypto->decrypt($signed, $unlockKey);
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
               $this->createContentTypesAndInsertInitialData(Packager::WEBSITE_CONFIG_VIRTUAL_FILE_NAME,
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
            if ($this->db->exec('INSERT INTO ${p}websiteState VALUES (1,?,?,?,?,?)',
                                [
                                    $s->siteName,
                                    $s->siteLang,
                                    $s->installedContentTypes ?? '{}',
                                    $s->installedContentTypesLastUpdated ?? null,
                                    $s->installedPlugins ?? '{}',
                                ]) < 1)
                throw new PikeException('Failed to insert main schema data',
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
    private function createContentTypesAndInsertInitialData($siteCfgFilePath, $dataFilePath, $fs) {
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
    private function cloneTemplatesAndCfgFile($s) {
        //
        $path = $this->siteDirPath . 'uploads';
        if (!$this->fs->isDir($path) && !$this->fs->mkDir($path))
            throw new PikeException("Failed to create `{$path}`",
                                    PikeException::FAILED_FS_OP);
        //
        $base = "{$this->backendPath}installer/sample-content/{$s->sampleContent}/";
        $base2 = "{$base}frontend/";
        if (!($tmplFilePaths = $this->fs->readDir($base, '*.tmpl.php')))
            throw new PikeException("Failed to read `{$base}*.tmpl.php`",
                                    PikeException::FAILED_FS_OP);
        if (!($assetFilePaths = $this->fs->readDir($base2, '*.{css,js}', GLOB_ERR|GLOB_BRACE)))
            throw new PikeException("Failed to read `{$base2}*.{css,js}`",
                                    PikeException::FAILED_FS_OP);
        //
        $toBeCopied = [
            [$base . 'site.json', $base],
            [$base . 'README.md', $base],
        ];
        foreach ($tmplFilePaths as $fullFilePath)
            $toBeCopied[] = [$fullFilePath, $base];
        foreach ($assetFilePaths as $fullFilePath)
            $toBeCopied[] = [$fullFilePath, $base2];
        //
        foreach ($toBeCopied as [$fullFilePath, $base]) {
            $fileName = substr($fullFilePath, mb_strlen($base));
            if (!$this->fs->copy($fullFilePath, $this->siteDirPath . $fileName)) {
                throw new PikeException('Failed to copy `' . $fullFilePath . '`' . 
                                        ' -> `' . $this->siteDirPath . $fileName . '`',
                                        PikeException::FAILED_FS_OP);
            }
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
    define('RAD_USE_BUNDLED_JS', 2 << 1);
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
     * @return null|string null = ok, string = dirOrFilePath
     */
    private function deleteFilesRecursive($dirPath) {
        foreach ($this->fs->readDir($dirPath) as $path) {
            if ($this->fs->isFile($path)) {
                if (!$this->fs->unlink($path)) return $path;
            } else if (($failedItem = $this->deleteFilesRecursive($path))) {
                return $failedItem;
            }
        }
        return $this->fs->rmDir($dirPath) ? null : $dirPath;
    }
}
