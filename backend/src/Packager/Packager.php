<?php

declare(strict_types=1);

namespace RadCms\Packager;

use Pike\{AppConfig, ArrayUtils, Auth\Crypto, Db, PikeException};
use Pike\Interfaces\FileSystemInterface;
use RadCms\{CmsState, Content\DAO};
use RadCms\ContentType\{ContentTypeCollection, ContentTypeMigrator};
use RadCms\Entities\PluginPackData;
use RadCms\Plugin\Plugin;

class Packager {
    public const LOCAL_NAMES_MAIN_DATA = 'main-data.data';
    public const LOCAL_NAMES_PHP_FILES_FILE_LIST = 'php-files-list.json';
    public const LOCAL_NAMES_ASSETS_FILE_LIST = 'theme-asset-files-list.json';
    public const LOCAL_NAMES_UPLOADS_FILE_LIST = 'theme-upload-files-list.json';
    public const LOCAL_NAMES_PLUGINS = 'theme-plugins.data';
    public const MIN_SIGNING_KEY_LEN = 12;
    /** @var \Pike\Db */
    private $db;
    /** @var \Pike\Interfaces\FileSystemInterface */
    private $fs;
    /** @var \Pike\Auth\Crypto */
    private $crypto;
    /** @var \RadCms\CmsState */
    private $cmsState;
    /** @var \Pike\AppConfig */
    private $appConfig;
    /**
     * @param \Pike\Db $db
     * @param \Pike\Interfaces\FileSystemInterface $fs
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
     * @param string $groupName
     * @return string[]
     */
    public function getIncludables(string $groupName): array {
        $makeRelatifier = function ($len) { return function ($fullFilePath) use ($len) {
            return substr($fullFilePath, $len);
        }; };
        //
        switch ($groupName) {
        case 'templates';
            $workspaceDirPath = RAD_WORKSPACE_PATH . 'site/';
            $out = array_map($makeRelatifier(mb_strlen($workspaceDirPath)),
                $this->fs->readDirRecursive($workspaceDirPath, '/^.*\.tmpl\.php$/'));
            break;
        case 'assets':
            $frontendDirPath = RAD_PUBLIC_PATH . 'frontend/';
            $f = str_replace('/', '\\/', $frontendDirPath);
            $out = array_map($makeRelatifier(mb_strlen($frontendDirPath)),
                $this->fs->readDirRecursive($frontendDirPath, "/^(?!{$f}rad\/).*\.(css|js)$/"));
            break;
        case 'uploads':
            $uploadsDirPath = RAD_PUBLIC_PATH . 'uploads/';
            $flags = \FilesystemIterator::CURRENT_AS_PATHNAME|\FilesystemIterator::SKIP_DOTS;
            $out = array_map($makeRelatifier(mb_strlen($uploadsDirPath)),
                $this->fs->readDirRecursive($uploadsDirPath, '/.*/', $flags));
            break;
        case 'plugins':
            $out = $this->getInstalledPluginNames();
            break;
        default:
            throw new PikeException('Unexpected groupName',
                                    PikeException::BAD_INPUT);
        }
        //
        sort($out);
        return $out;
    }
    /**
     * @param \RadCms\Packager\PackageStreamInterface $package
     * @param \stdClass $input Olettaa että validi
     * @param \stdClass $userIdentity Olettaa että validi
     * @return string
     * @throws \Pike\PikeException
     */
    public function packSite(PackageStreamInterface $package,
                             \stdClass $input,
                             \stdClass $userIdentity,
                             DAO $dao): string {
        // @allow \Pike\PikeException
        $package->open('', true);
        // @allow \Pike\PikeException
        $ok = $this->addMainData($package, $input, $userIdentity) &&
            $this->addPhpFiles($package, $input) &&
            $this->addAssetFiles($package, $input) &&
            $this->addUploadFiles($package, $input) &&
            $this->addPlugins($package, $input, $dao);
        // @allow \Pike\PikeException
        return $ok ? $package->getResult() : '';
    }
    /**
     * @param string $possiblyShorterOrLongerKey
     * @return string
     */
    public static function makeFixedLengthKey(string $possiblyShorterOrLongerKey): string {
        // @allow \Pike\PikeException
        $padded = str_pad($possiblyShorterOrLongerKey, Crypto::SECRETBOX_KEYBYTES, '0');
        return substr($padded, 0, Crypto::SECRETBOX_KEYBYTES);
    }
    /**
     * @access private
     */
    private function getInstalledPluginNames(): array {
        $out = [];
        foreach ($this->cmsState->getPlugins() as $plugin) {
            if ($plugin->isInstalled) $out[] = $plugin->name;
        }
        return $out;
    }
    /**
     * @throws \Pike\PikeException
     */
    private function addMainData(PackageStreamInterface $package,
                                 \stdClass $input,
                                 \stdClass $userIdentity): bool {
        $themeContentTypes = ArrayUtils::filterByKey($this->cmsState->getContentTypes(),
                                                     'Website',
                                                     'origin');
        // @allow \Pike\PikeException
        $data = $this->encryptData($input->signingKey, (object) [
            'settings' => $this->generateSettings(),
            'contentTypes' => $themeContentTypes->toCompactForm('Website'),
            'content' => $this->generateThemeContentData($themeContentTypes),
            'user' => $this->generateUserZero($userIdentity),
        ]);
        $package->addFromString(self::LOCAL_NAMES_MAIN_DATA, $data);
        return true;
    }
    /**
     * @throws \Pike\PikeException
     */
    private function addPhpFiles(PackageStreamInterface $package,
                                 \stdClass $input): bool {
        $base = RAD_WORKSPACE_PATH . 'site/';
        //
        $fileList = ['Site.php'];
        if ($this->fs->isFile("{$base}Theme.php"))
            $fileList[] = 'Theme.php';
        $fileList = array_merge($fileList, $input->templates);
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
                                   \stdClass $input): bool {
        $package->addFromString(self::LOCAL_NAMES_ASSETS_FILE_LIST,
                                json_encode($input->assets));
        $base = RAD_PUBLIC_PATH . 'frontend/';
        foreach ($input->assets as $relativePath)
            // @allow \Pike\PikeException
            $package->addFile("{$base}{$relativePath}", $relativePath);
        return true;
    }
    /**
     * @throws \Pike\PikeException
     */
    private function addUploadFiles(PackageStreamInterface $package,
                                    \stdClass $input): bool {
        $package->addFromString(self::LOCAL_NAMES_UPLOADS_FILE_LIST,
                                json_encode($input->uploads));
        $base = RAD_PUBLIC_PATH . 'uploads/';
        foreach ($input->uploads as $relativePath)
            // @allow \Pike\PikeException
            $package->addFile("{$base}{$relativePath}", $relativePath);
        return true;
    }
    /**
     * @throws \Pike\PikeException
     */
    private function addPlugins(PackageStreamInterface $package,
                                \stdClass $input,
                                DAO $dao): bool {
        $plugins = new \stdClass;
        foreach ($input->plugins as $pluginName) {
            // @allow \Pike\PikeException
            $pluginImpl = (new Plugin($pluginName))->instantiate();
            //
            $fillThisPlease = new PluginPackData;
            $pluginImpl->pack($dao, $fillThisPlease);
            // @allow \Pike\PikeException
            ContentTypeMigrator::validateInitialData($fillThisPlease->initialContent);
            // todo data->assets
            // todo sorsat
            //
            $plugins->{$pluginName} = $fillThisPlease;
        }
        // @allow \Pike\PikeException
        $data = $this->encryptData($input->signingKey, $plugins);
        $package->addFromString(self::LOCAL_NAMES_PLUGINS, $data);
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
     * @throws \Pike\PikeException
     */
    private function encryptData(string $key, object $data): string {
        // @allow \Pike\PikeException
        return $this->crypto->encrypt(json_encode($data, JSON_UNESCAPED_UNICODE),
                                      self::makeFixedLengthKey($key));
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
