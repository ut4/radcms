<?php

namespace RadCms\Installer;

use Pike\Db;
use Pike\Auth\Crypto;
use Pike\FileSystem;
use Pike\FileSystemInterface;
use Pike\PikeException;
use RadCms\Auth\ACL;

/**
 * Sisältää Installerin ja PackageInstallerin yhteiset toiminnallisuudet.
 */
class InstallerCommons {
    private $db;
    private $fs;
    private $crypto;
    private $backendPath;
    private $siteDirPath;
    private $warnings;
    /**
     * @param \Pike\Db $db
     * @param \Pike\FileSystemInterface $fs
     * @param \Pike\Auth\Crypto
     * @param string $siteDirPath
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
     * @param \stdClass $s settings
     * @return bool
     * @throws \Pike\PikeException
     */
    public function createOrOpenDb($s) {
        try {
            $this->db->setConfig([
                'db.host'        => $s->dbHost,
                'db.database'    => $s->doCreateDb ? '' : $s->dbDatabase,
                'db.user'        => $s->dbUser,
                'db.pass'        => $s->dbPass,
                'db.tablePrefix' => $s->dbTablePrefix,
                'db.charset'     => $s->dbCharset,
            ]);
            $this->db->open();
        } catch (\PDOException $e) {
            throw new PikeException($e->getMessage(), PikeException::FAILED_DB_OP);
        }
        if (!$s->doCreateDb)
            return true;
        try {
            $this->db->attr(\PDO::ATTR_EMULATE_PREPARES, 1);
            $this->db->exec("CREATE DATABASE {$s->dbDatabase}");
        } catch (\PDOException $e) {
            throw new PikeException($e->getMessage(), PikeException::FAILED_DB_OP);
        }
        return true;
    }
    /**
     * @param \stdClass $s settings
     * @param \Pike\FileSystemInterface|\RadCms\Packager\PackageStreamInterface $fsOrPackage
     * @param string $filePathOrLocalName
     * @return bool
     * @throws \Pike\PikeException
     */
    public function createMainSchema($s, $fsOrPackage, $filePathOrLocalName) {
        try {
            $sql = $fsOrPackage->read($filePathOrLocalName);
            if (!$sql)
                throw new PikeException("Failed to read `{$filePathOrLocalName}`",
                                        PikeException::FAILED_FS_OP);
            $this->db->exec(str_replace('${database}', $s->dbDatabase, $sql));
            $this->db->attr(\PDO::ATTR_EMULATE_PREPARES, 0);
        } catch (\PDOException $e) {
            throw new PikeException($e->getMessage(), PikeException::FAILED_DB_OP);
        }
        return true;
    }
    /**
     * @param \stdClass $s settings
     * @return bool
     * @throws \Pike\PikeException
     */
    public function insertMainSchemaData($s) {
        try {
            if ($this->db->exec('INSERT INTO ${p}cmsState VALUES (1,?,?,?,?,?,?)',
                                [
                                    $s->siteName,
                                    $s->siteLang,
                                    '{}', // installedContentTypes
                                    null, // installedContentTypesLastUpdated
                                    $s->installedPlugins ?? '{}',
                                    $s->aclRules ?? $this->makeDefaultAclRules(),
                                ]) !== 1)
                throw new PikeException('Failed to insert main schema data',
                                        PikeException::INEFFECTUAL_DB_OP);
        } catch (\PDOException $e) {
            throw new PikeException($e->getMessage(), PikeException::FAILED_DB_OP);
        }
        return true;
    }
    /**
     * @param \stdClass $s settings
     * @param \stdClass $user = null {id: string, username: string, email: string, passwordHash: string, role: int}
     * @return bool
     * @throws \Pike\PikeException
     */
    public function createUserZero($s, $user = null) {
        try {
            if ($this->db->exec('INSERT INTO ${p}users'.
                                ' (`id`,`username`,`email`,`passwordHash`,`role`)' .
                                ' VALUES (?,?,?,?,?)',
                                !$user ? [
                                    $this->crypto->guidv4(),
                                    $s->firstUserName,
                                    $s->firstUserEmail ?? '',
                                    $this->crypto->hashPass($s->firstUserPass),
                                    ACL::ROLE_SUPER_ADMIN
                                ] : [
                                    $user->id,
                                    $user->username,
                                    $user->email,
                                    $user->passwordHash,
                                    $user->role,
                                ]) !== 1)
                throw new PikeException('Failed to insert user zero',
                                        PikeException::INEFFECTUAL_DB_OP);
        } catch (\PDOException $e) {
            throw new PikeException($e->getMessage(), PikeException::FAILED_DB_OP);
        }
        return true;
    }
    /**
     * @throws \Pike\PikeException
     */
    public function createSiteDirectories() {
        foreach ([$this->siteDirPath . 'uploads',
                  $this->siteDirPath . 'theme'] as $path) {
            if (!$this->fs->isDir($path) && !$this->fs->mkDir($path))
                throw new PikeException("Failed to create `{$path}`",
                                        PikeException::FAILED_FS_OP);
        }
    }
    /**
     * @return string
     * @throws \Pike\PikeException
     */
    public function makeDefaultAclRules() {
        $fn = include "{$this->backendPath}installer/default-acl-rules.php";
        return json_encode($fn());
    }
    /**
     * @param \stdClass $s settings
     * @return bool
     * @throws \Pike\PikeException
     */
    public function generateConfigFile($s) {
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
    'mail.transport' => 'phpsMailFunction',
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
    public function selfDestruct() {
        if (defined('TEST_SITE_PATH') &&
            !($this->fs instanceof \PHPUnit\Framework\MockObject\MockObject))
            return true;
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
    /**
     * @return string
     */
    public function getBackendPath() {
        return $this->backendPath;
    }
    /**
     * @return string
     */
    public function getSiteDirPath() {
        return $this->siteDirPath;
    }
    /**
     * @return string[]
     */
    public function getWarnings() {
        return $this->warnings;
    }
}
