<?php

declare(strict_types=1);

namespace RadCms\Packager;

use Pike\Db;
use Pike\AppConfig;
use Pike\ArrayUtils;
use Pike\Auth\Crypto;
use Pike\FileSystemInterface;
use Pike\PikeException;
use RadCms\CmsState;
use RadCms\Content\DAO;
use RadCms\ContentType\ContentTypeCollection;

class Packager {
    public const LOCAL_NAMES_MAIN_DATA = 'main-data.data';
    public const LOCAL_NAMES_PHP_FILES_FILE_LIST = 'php-files-list.json';
    public const LOCAL_NAMES_ASSETS_FILE_LIST = 'theme-asset-files-list.json';
    public const LOCAL_NAMES_UPLOADS_FILE_LIST = 'theme-upload-files-list.json';
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
     * @return \stdClass {templates: string[], assets: string[], uploads: string[]}
     * @throws \Pike\PikeException
     */
    public function preRun(): \stdClass {
        $siteDirPath = RAD_PUBLIC_PATH . 'site/';
        $len1 = mb_strlen($siteDirPath);
        $fullPathToRelPath = function ($fullFilePath) use ($len1) {
            return substr($fullFilePath, $len1);
        };
        $uploadsDirPath = RAD_PUBLIC_PATH . 'uploads/';
        $len2 = mb_strlen($uploadsDirPath);
        $flags = \FilesystemIterator::CURRENT_AS_PATHNAME|\FilesystemIterator::SKIP_DOTS;
        // @allow \Pike\PikeException
        $out = (object) [
            'templates' => array_map($fullPathToRelPath,
                $this->fs->readDirRecursive($siteDirPath, '/^.*\.tmpl\.php$/')),
            'assets' => array_map($fullPathToRelPath,
                $this->fs->readDirRecursive($siteDirPath, '/^.*\.(css|js)$/')),
            'uploads' => array_map(function ($fullFilePath) use ($len2) {
                return substr($fullFilePath, $len2);
            }, $this->fs->readDirRecursive($uploadsDirPath, '/.*/', $flags))
        ];
        sort($out->templates);
        sort($out->assets);
        sort($out->uploads);
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
                             \stdClass $userIdentity): string {
        // @allow \Pike\PikeException
        $package->open('', true);
        // @allow \Pike\PikeException
        $ok = $this->addMainData($package, $config, $userIdentity) &&
            $this->addPhpFiles($package, $config) &&
            $this->addAssetFiles($package, $config) &&
            $this->addUploadFiles($package, $config);
        // @allow \Pike\PikeException
        return $ok ? $package->getResult() : '';
    }
    /**
     * @throws \Pike\PikeException
     */
    private function addMainData(PackageStreamInterface $package,
                                 \stdClass $config,
                                 \stdClass $userIdentity): bool {
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
        return true;
    }
    /**
     * @throws \Pike\PikeException
     */
    private function addPhpFiles(PackageStreamInterface $package,
                                 \stdClass $config): bool {
        $base = RAD_PUBLIC_PATH . 'site/';
        //
        $fileList = ['Site.php'];
        if ($this->fs->isFile("{$base}Theme.php"))
            $fileList[] = 'Theme.php';
        $fileList = array_merge($fileList, $config->templatesParsed);
        $package->addFromString(self::LOCAL_NAMES_PHP_FILES_FILE_LIST,
                                json_encode($fileList, JSON_UNESCAPED_UNICODE));
        foreach ($fileList as $relativePath)
            // @allow \Pike\PikeException
            $package->addFile("{$base}{$relativePath}", $relativePath);
        return true;
    }
    /**
     * @throws \Pike\PikeException
     */
    private function addAssetFiles(PackageStreamInterface $package,
                                   \stdClass $config): bool {
        $package->addFromString(self::LOCAL_NAMES_ASSETS_FILE_LIST, $config->assets);
        $base = RAD_PUBLIC_PATH . 'site/';
        foreach ($config->assetsParsed as $relativePath)
            // @allow \Pike\PikeException
            $package->addFile("{$base}{$relativePath}", $relativePath);
        return true;
    }
    /**
     * @throws \Pike\PikeException
     */
    private function addUploadFiles(PackageStreamInterface $package,
                                    \stdClass $config): bool {
        $package->addFromString(self::LOCAL_NAMES_UPLOADS_FILE_LIST, $config->uploads);
        $base = RAD_PUBLIC_PATH . 'uploads/';
        foreach ($config->uploadsParsed as $relativePath)
            // @allow \Pike\PikeException
            $package->addFile("{$base}{$relativePath}", $relativePath);
        return true;
    }
    /**
     * @return \stdClass
     */
    private function generateSettings(): \stdClass {
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
    private function generateThemeContentData(ContentTypeCollection $themeContentTypes): array {
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
    private function generateUserZero(\stdClass $userIdentity): \stdClass {
        // @allow \Pike\PikeException
        if (($row = $this->db->fetchOne('SELECT `id`,`username`,`email`' .
                                        ',`passwordHash`,`role`,`accountCreatedAt`' .
                                        ' FROM ${p}users' .
                                        ' WHERE `id` = ?',
                                        [$userIdentity->id]))) {
            return (object) [
                'id' => $row['id'],
                'username' => $row['username'],
                'email' => $row['email'] ?? '',
                'passwordHash' => $row['passwordHash'],
                'role' => (int) $row['role'],
                'accountCreatedAt' => (int) $row['accountCreatedAt'],
            ];
        }
        throw new PikeException('Failed to fetch user from db',
                                PikeException::BAD_INPUT);
    }
}
