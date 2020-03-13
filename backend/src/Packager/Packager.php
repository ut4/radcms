<?php

namespace RadCms\Packager;

use Pike\Db;
use Pike\AppConfig;
use Pike\ArrayUtils;
use Pike\Auth\Crypto;
use Pike\FileSystemInterface;
use RadCms\CmsState;
use RadCms\Content\DAO;
use RadCms\Auth\ACL;

class Packager {
    public const MAIN_DATA_LOCAL_NAME = 'main-data.data';
    public const DB_SCHEMA_LOCAL_NAME = 'schema.mariadb.sql';
    public const TEMPLATE_FILE_NAMES_LOCAL_NAME = 'template-file-names.json';
    public const THEME_ASSET_FILE_NAMES_LOCAL_NAME = 'theme-asset-file-names.json';
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
     * @return \stdClass {templates: string[], themeAssets: string[]}
     * @throws \Pike\PikeException
     */
    public function preRun() {
        // @allow \Pike\PikeException
        $dirPath = RAD_SITE_PATH . 'theme/';
        $len = mb_strlen($dirPath);
        $fullPathToFileName = function ($fullFilePath) use ($len) {
            return substr($fullFilePath, $len);
        };
        return (object) [
            'templates' => array_map($fullPathToFileName,
                $this->fs->readDir($dirPath, '*.tmpl.php')),
            'themeAssets' => array_map($fullPathToFileName,
                $this->fs->readDir($dirPath, '*.{css,js}', GLOB_ERR|GLOB_BRACE))
        ];
    }
    /**
     * @param \RadCms\Packager\PackageStreamInterface $package
     * @param \stdClass $config Olettaa että validi
     * @return string
     * @throws \Pike\PikeException
     */
    public function packSite(PackageStreamInterface $package, \stdClass $config) {
        // @allow \Pike\PikeException
        $package->open('', true);
        // @allow \Pike\PikeException
        $this->addMainData($package, $config);
        // @allow \Pike\PikeException
        $this->addDbSchema($package);
        // @allow \Pike\PikeException
        $this->addThemeFiles($package, $config->templates,
            self::TEMPLATE_FILE_NAMES_LOCAL_NAME);
        // @allow \Pike\PikeException
        $this->addThemeFiles($package, $config->themeAssets,
            self::THEME_ASSET_FILE_NAMES_LOCAL_NAME);
        // @allow \Pike\PikeException
        return $package->getResult();
    }
    /**
     * @throws \Pike\PikeException
     */
    private function addMainData($package, $config) {
        $themeContentTypes = ArrayUtils::filterByKey($this->cmsState->getContentTypes(),
                                                     'Website',
                                                     'origin');
        // @allow \Pike\PikeException
        $data = json_encode((object) [
            'settings' => $this->generateSettings(),
            'contentTypes' => $themeContentTypes->toCompactForm('Website'),
            'content' => $this->generateThemeContentData($themeContentTypes),
            'user' => $this->generateUser(),
        ], JSON_UNESCAPED_UNICODE);
        // @allow \Pike\PikeException
        $padded = str_pad($config->signingKey, Crypto::SECRETBOX_KEYBYTES, '0');
        $key = substr($padded, 0, Crypto::SECRETBOX_KEYBYTES);
        $encrypted = $this->crypto->encrypt($data, $key);
        // @allow \Pike\PikeException
        $package->addFromString(self::MAIN_DATA_LOCAL_NAME, $encrypted);
    }
    /**
     * @throws \Pike\PikeException
     */
    private function addDbSchema($package) {
        // @allow \Pike\PikeException
        $package->addFile(RAD_BASE_PATH . 'assets/schema.mariadb.sql',
                          self::DB_SCHEMA_LOCAL_NAME);
    }
    /**
     * @throws \Pike\PikeException
     */
    private function addThemeFiles($package, $files, $fileListFileLocalName) {
        $package->addFromString($fileListFileLocalName,
                                json_encode($files, JSON_UNESCAPED_UNICODE));
        $base = RAD_SITE_PATH . 'theme/';
        foreach ($files as $fileName) {
            // @allow \Pike\PikeException
            $package->addFile($base . str_replace('../', '', $fileName),
                              $fileName);
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
    private function generateUser() {
        return (object) [
            'id' => 'todo',
            'username' => 'todo',
            'email' => 'todo',
            'passwordHash' => 'todo',
            'role' => ACL::ROLE_SUPER_ADMIN,
        ];
    }
}
