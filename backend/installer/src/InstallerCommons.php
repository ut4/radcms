<?php

declare(strict_types=1);

namespace RadCms\Installer;

use Pike\Auth\{Authenticator, Crypto};
use Pike\{Db, FileSystem, PikeException};
use Pike\Interfaces\FileSystemInterface;
use RadCms\Auth\ACL;

/**
 * Sisältää Installerin ja PackageInstallerin yhteiset toiminnallisuudet.
 */
class InstallerCommons {
    private $db;
    private $fs;
    private $crypto;
    private $backendDirPath;
    private $workspaceDirPath;
    private $publicDirPath;
    private $warnings;
    /**
     * @param \Pike\Db $db
     * @param \Pike\Interfaces\FileSystemInterface $fs
     * @param \Pike\Auth\Crypto
     * @param string $workspaceDirPath = RAD_WORKSPACE_PATH
     * @param string $publicDirPath = RAD_PUBLIC_PATH
     */
    public function __construct(Db $db,
                                FileSystemInterface $fs,
                                Crypto $crypto,
                                string $workspaceDirPath = RAD_WORKSPACE_PATH,
                                string $publicDirPath = RAD_PUBLIC_PATH) {
        $this->db = $db;
        $this->fs = $fs;
        $this->crypto = $crypto;
        $this->backendDirPath = FileSystem::normalizePath(RAD_BACKEND_PATH) . '/';
        $this->workspaceDirPath = FileSystem::normalizePath($workspaceDirPath) . '/';
        $this->publicDirPath = FileSystem::normalizePath($publicDirPath) . '/';
        $this->warnings = [];
    }
    /**
     * @param \stdClass $s settings
     * @return bool
     * @throws \Pike\PikeException
     */
    public function createOrOpenDb(\stdClass $s): bool {
        $this->db->setConfig([
            'db.host'        => $s->dbHost,
            'db.database'    => $s->doCreateDb ? '' : $s->dbDatabase,
            'db.user'        => $s->dbUser,
            'db.pass'        => $s->dbPass,
            'db.tablePrefix' => $s->dbTablePrefix,
            'db.charset'     => $s->dbCharset,
        ]);
        // @allow \Pike\PikeException
        $this->db->open();
        if (!$s->doCreateDb)
            return true;
        $this->db->attr(\PDO::ATTR_EMULATE_PREPARES, 1);
        // @allow \Pike\PikeException
        $this->db->exec("CREATE DATABASE {$s->dbDatabase}");
        return true;
    }
    /**
     * @param \stdClass $s settings
     * @return bool
     * @throws \Pike\PikeException
     */
    public function createMainSchema(\stdClass $s): bool {
        $sql = $this->fs->read("{$this->backendDirPath}assets/schema.mariadb.sql");
        if (!$sql)
            throw new PikeException("Failed to read `{$this->backendDirPath}assets/schema.mariadb.sql`",
                                    PikeException::FAILED_FS_OP);
        // @allow \Pike\PikeException
        $this->db->exec(str_replace('${database}', $s->dbDatabase, $sql));
        $this->db->attr(\PDO::ATTR_EMULATE_PREPARES, 0);
        return true;
    }
    /**
     * @param \stdClass $s settings
     * @return bool
     * @throws \Pike\PikeException
     */
    public function insertMainSchemaData(\stdClass $s): bool {
        // @allow \Pike\PikeException
        if ($this->db->exec('INSERT INTO ${p}cmsState VALUES (1,?,?,?,?,?,?)',
                            [
                                $s->siteName,
                                $s->siteLang,
                                '[]', // installedContentTypes
                                null, // installedContentTypesLastUpdated
                                $s->installedPlugins ?? '{}',
                                json_encode($s->aclRules ?? $this->makeDefaultAclRules()),
                            ]) !== 1)
            throw new PikeException('Failed to insert main schema data',
                                    PikeException::INEFFECTUAL_DB_OP);
        return true;
    }
    /**
     * @param \stdClass $s settings
     * @param \stdClass $user = null {id: string, username: string, email: string, passwordHash: string, role: int}
     * @return bool
     * @throws \Pike\PikeException
     */
    public function createUserZero(\stdClass $s, \stdClass $user = null): bool {
        // @allow \Pike\PikeException
        if ($this->db->exec('INSERT INTO ${p}users'.
                            ' (`id`,`username`,`email`,`passwordHash`,`role`' .
                              ',`accountCreatedAt`,`accountStatus`)' .
                            ' VALUES (?,?,?,?,?,?,?)',
                            !$user ? [
                                $this->crypto->guidv4(),
                                $s->firstUserName,
                                $s->firstUserEmail ?? '',
                                $this->crypto->hashPass($s->firstUserPass),
                                ACL::ROLE_SUPER_ADMIN,
                                time(),
                                Authenticator::ACCOUNT_STATUS_ACTIVATED,
                            ] : [
                                $user->id,
                                $user->username,
                                $user->email,
                                $user->passwordHash,
                                $user->role,
                                $user->accountCreatedAt,
                                Authenticator::ACCOUNT_STATUS_ACTIVATED,
                            ]) !== 1)
            throw new PikeException('Failed to insert user zero',
                                    PikeException::INEFFECTUAL_DB_OP);
        return true;
    }
    /**
     * @return string[] [$workspaceDirPath, $publicDirPath]
     * @throws \Pike\PikeException
     */
    public function createPublicAndWorkspaceDirs(): array {
        foreach (["{$this->workspaceDirPath}site/templates",
                  "{$this->publicDirPath}uploads"] as $path) {
            if (!$this->fs->isDir($path) && !$this->fs->mkDir($path))
                throw new PikeException("Failed to create `{$path}`",
                                        PikeException::FAILED_FS_OP);
        }
        return [$this->workspaceDirPath, $this->publicDirPath];
    }
    /**
     * @return \stdClass
     * @throws \Pike\PikeException
     */
    public function makeDefaultAclRules(): \stdClass {
        $fn = include "{$this->backendDirPath}installer/default-acl-rules.php";
        return $fn();
    }
    /**
     * @param \stdClass $s settings
     * @return bool
     * @throws \Pike\PikeException
     */
    public function generateConfigFile(\stdClass $s): bool {
        $flags = $s->useDevMode ? 'RAD_DEVMODE' : '0';
        if ($this->fs->write(
            "{$this->publicDirPath}config.php",
"<?php
if (!defined('RAD_BASE_URL')) {
    define('RAD_BASE_URL',       '{$s->baseUrl}');
    define('RAD_QUERY_VAR',      '{$s->mainQueryVar}');
    define('RAD_BACKEND_PATH',   '{$this->backendDirPath}');
    define('RAD_WORKSPACE_PATH', '{$this->workspaceDirPath}');
    define('RAD_PUBLIC_PATH',    '{$this->publicDirPath}');
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
        throw new PikeException("Failed to generate `{$this->publicDirPath}config.php`",
                                PikeException::FAILED_FS_OP);
    }
    /**
     * @return bool
     * @throws \Pike\PikeException
     */
    public function selfDestruct(): bool {
        if (defined('TEST_SITE_PUBLIC_PATH') &&
            !($this->fs instanceof \PHPUnit\Framework\MockObject\MockObject))
            return true;
        foreach ([
            'install.php',
            'frontend/rad/install-app.css',
            'frontend/rad/rad-install-app.js'
        ] as $p) {
            if (!$this->fs->unlink("{$this->publicDirPath}{$p}"))
                $this->warnings[] = "Failed to remove `{$this->publicDirPath}{$p}`";
        }
        //
        $installerDirPath = "{$this->backendDirPath}installer";
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
    private function deleteFilesRecursive(string $dirPath): ?string {
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
    public function getBackendDirPath(): string {
        return $this->backendDirPath;
    }
    /**
     * @return string
     */
    public function getPublicDirPath(): string {
        return $this->publicDirPath;
    }
    /**
     * @param string $path
     */
    public function setPublicDirPath(string $path): void {
        $this->publicDirPath = FileSystem::normalizePath($path) . '/';
    }
    /**
     * @return string[]
     */
    public function getWarnings(): array {
        return $this->warnings;
    }
}
