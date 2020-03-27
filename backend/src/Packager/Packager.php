<?php

namespace RadCms\Packager;

use Pike\Db;
use Pike\AppConfig;
use Pike\ArrayUtils;
use Pike\Auth\Crypto;
use Pike\FileSystemInterface;
use Pike\PikeException;
use RadCms\CmsState;
use RadCms\Content\DAO;

class Packager {
    public const LOCAL_NAMES_MAIN_DATA = 'main-data.data';
    public const LOCAL_NAMES_DB_SCHEMA = 'schema.mariadb.sql';
    public const LOCAL_NAMES_TEMPLATES_FILEMAP = 'template-file-paths.json';
    public const LOCAL_NAMES_ASSETS_FILEMAP = 'theme-asset-file-paths.json';
    /** @var \Pike\Db */
    private $db;
    /** @var \Pike\FileSystemInterface */
    private $fs;
    /** @var \Pike\Auth\Crypto */
    private $crypto;
    /** @var \RadCms\CmsState */
    private $cmsState;
    /** @var \Pike\AppConfig */
    private $appConfig;
    /**
     * @param \Pike\Db $db
     * @param \Pike\FileSystemInterface $fs
     * @param \Pike\Auth\Crypto $crypto
     * @param \RadCms\CmsState $cmsState
     * @param \Pike\AppConfig $appConfig
     */
    public function __construct(Db $db,
                                FileSystemInterface $fs,
                                Crypto $crypto,
                                CmsState $cmsState,
                                AppConfig $appConfig) {
        $this->db = $db;
        $this->fs = $fs;
        $this->crypto = $crypto;
        $this->cmsState = $cmsState;
        $this->appConfig = $appConfig;
    }
    /**
     * @return \stdClass {templates: string[], assets: string[]}
     * @throws \Pike\PikeException
     */
    public function preRun() {
        $dirPath = RAD_SITE_PATH . 'theme/';
        $len = mb_strlen($dirPath);
        $fullPathToRelPath = function ($fullFilePath) use ($len) {
            return substr($fullFilePath, $len);
        };
        // @allow \Pike\PikeException
        $out = (object) [
            'templates' => array_map($fullPathToRelPath,
                $this->fs->readDirRecursive($dirPath, '/^.*\.tmpl\.php$/')),
            'assets' => array_map($fullPathToRelPath,
                $this->fs->readDirRecursive($dirPath, '/^.*\.(css|js)$/'))
        ];
        sort($out->templates);
        sort($out->assets);
        return $out;
    }
    /**
     * @param \RadCms\Packager\PackageStreamInterface $package
     * @param \stdClass $config Olettaa että validi
     * @param \stdClass $userIdentity Olettaa että validi
     * @return string
     * @throws \Pike\PikeException
     */
    public function packSite(PackageStreamInterface $package,
                             \stdClass $config,
                             \stdClass $userIdentity) {
        // @allow \Pike\PikeException
        $package->open('', true);
        // @allow \Pike\PikeException
        $this->addMainData($package, $config, $userIdentity);
        // @allow \Pike\PikeException
        $this->addDbSchema($package);
        // @allow \Pike\PikeException
        $this->addThemeFiles($package, $config->templates,
            self::LOCAL_NAMES_TEMPLATES_FILEMAP);
        // @allow \Pike\PikeException
        $this->addThemeFiles($package, $config->assets,
            self::LOCAL_NAMES_ASSETS_FILEMAP);
        // @allow \Pike\PikeException
        return $package->getResult();
    }
    /**
     * @throws \Pike\PikeException
     */
    private function addMainData($package, $config, $userIdentity) {
        $themeContentTypes = ArrayUtils::filterByKey($this->cmsState->getContentTypes(),
                                                     'Website',
                                                     'origin');
        // @allow \Pike\PikeException
        $data = json_encode((object) [
            'settings' => $this->generateSettings(),
            'contentTypes' => $themeContentTypes->toCompactForm('Website'),
            'content' => $this->generateThemeContentData($themeContentTypes),
            'user' => $this->generateUserZero($userIdentity),
        ], JSON_UNESCAPED_UNICODE);
        // @allow \Pike\PikeException
        $padded = str_pad($config->signingKey, Crypto::SECRETBOX_KEYBYTES, '0');
        $key = substr($padded, 0, Crypto::SECRETBOX_KEYBYTES);
        $encrypted = $this->crypto->encrypt($data, $key);
        // @allow \Pike\PikeException
        $package->addFromString(self::LOCAL_NAMES_MAIN_DATA, $encrypted);
    }
    /**
     * @throws \Pike\PikeException
     */
    private function addDbSchema($package) {
        // @allow \Pike\PikeException
        $package->addFile(RAD_BASE_PATH . 'assets/schema.mariadb.sql',
                          self::LOCAL_NAMES_DB_SCHEMA);
    }
    /**
     * @throws \Pike\PikeException
     */
    private function addThemeFiles($package, $files, $localNameOfFileMapFile) {
        $package->addFromString($localNameOfFileMapFile,
                                json_encode($files, JSON_UNESCAPED_UNICODE));
        $base = RAD_SITE_PATH . 'theme/';
        foreach ($files as $relativePath) {
            // @allow \Pike\PikeException
            $package->addFile("{$base}{$relativePath}", $relativePath);
        }
    }
    /**
     * @return \stdClass
     */
    private function generateSettings() {
        return (object) [
            'dbHost' => $this->appConfig->get('db.host'),
            'dbDatabase' => $this->appConfig->get('db.database'),
            'doCreateDb' => true,
            'dbUser' => $this->appConfig->get('db.user'),
            'dbPass' => $this->appConfig->get('db.pass'),
            'dbTablePrefix' => $this->appConfig->get('db.tablePrefix'),
            'dbCharset' => $this->appConfig->get('db.charset'),
            //
            'siteName' => $this->cmsState->getSiteInfo()->name,
            'siteLang' => $this->cmsState->getSiteInfo()->lang,
            'aclRules' => $this->cmsState->getAclRules(),
            'mainQueryVar' => RAD_QUERY_VAR,
            'useDevMode' => boolval(RAD_FLAGS & RAD_DEVMODE),
        ];
    }
    /**
     * @return array [["Articles", ContentNode[]], ...]
     */
    private function generateThemeContentData($themeContentTypes) {
        $cNodeDAO = new DAO($this->db, $themeContentTypes);
        $out = [];
        foreach ($themeContentTypes as $ctype) {
            // @allow \Pike\PikeException
            if (!($nodes = $cNodeDAO->fetchAll($ctype->name)->exec()))
                continue;
            $out[] = [$ctype->name, $nodes];
        }
        return $out;
    }
    /**
     * @return \stdClass
     */
    private function generateUserZero($userIdentity) {
        try {
            if (($row = $this->db->fetchOne('SELECT `id`,`username`,`email`' .
                                            ',`passwordHash`,`role` FROM ${p}users' .
                                            ' WHERE `id` = ?',
                                            [$userIdentity->id]))) {
                return (object) [
                    'id' => $row['id'],
                    'username' => $row['username'],
                    'email' => $row['email'] ?? '',
                    'passwordHash' => $row['passwordHash'],
                    'role' => (int) $row['role'],
                ];
            }
            throw new PikeException('Failed to fetch user from db',
                                    PikeException::BAD_INPUT);
        } catch (\PDOException $e) {
            throw new PikeException("Unexpected database error: {$e->getMessage()}",
                                    PikeException::FAILED_DB_OP);
        }
    }
}
