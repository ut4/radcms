<?php

namespace RadCms\Packager;

use Pike\FileSystemInterface;
use RadCms\AppState;
use RadCms\Content\DAO;
use Pike\Db;
use Pike\Auth\Crypto;

class Packager {
    public const DB_CONFIG_VIRTUAL_FILE_NAME = 'db-config.json';
    public const WEBSITE_STATE_VIRTUAL_FILE_NAME = 'website-state.json';
    public const THEME_CONTENT_TYPES_VIRTUAL_FILE_NAME = 'theme-content-types.json';
    public const THEME_CONTENT_DATA_VIRTUAL_FILE_NAME = 'theme-content-data.json';
    public const WEBSITE_CONFIG_VIRTUAL_FILE_NAME = 'site.json';
    /** @var \RadCms\Packager\PackageStreamInterface */
    private $writer;
    /** @var \Pike\Auth\Crypto */
    private $crypto;
    /** @var \RadCms\AppState */
    private $appState;
    /** @var \Pike\FileSystemInterface */
    private $fs;
    /** @var \RadCms\ContentType\ContentTypeCollection */
    private $themeContentTypes;
    /** @var \RadCms\Content\DAO */
    private $cNodeDAO;
    /** @var object */
    private $config;
    /**
     * @param \RadCms\Packager\PackageStreamInterface $writer
     * @param \Pike\Auth\Crypto $crypto
     * @param \RadCms\AppState $appState
     * @param \Pike\Db $db
     * @param \Pike\FileSystemInterface $fs
     */
    public function __construct(PackageStreamInterface $writer,
                                Crypto $crypto,
                                AppState $state,
                                Db $db,
                                FileSystemInterface $fs) {
        $this->writer = $writer;
        $this->crypto = $crypto;
        $this->appState = $state;
        $this->fs = $fs;
        $this->themeContentTypes = $state->contentTypes->filter('site.json', 'origin');
        $this->cNodeDAO = new DAO($db, $this->themeContentTypes);
        $this->config = include RAD_INDEX_PATH . 'config.php';
    }
    /**
     * @param string $sitePath
     * @param string $signingKey
     * @throws \Pike\PikeException
     */
    public function packSite($sitePath, $signingKey) {
        // @allow \Pike\PikeException
        $this->writer->open('', true);
        //
        foreach ([
            [self::DB_CONFIG_VIRTUAL_FILE_NAME, function () {
                return $this->generateDbConfigJson();
            }],
            [self::WEBSITE_STATE_VIRTUAL_FILE_NAME, function () use ($sitePath) {
                return $this->generateWebsiteStateJson($sitePath);
            }],
            [self::WEBSITE_CONFIG_VIRTUAL_FILE_NAME, function () use ($sitePath) {
                return $this->fs->read($sitePath . 'site.json');
            }],
            [self::THEME_CONTENT_DATA_VIRTUAL_FILE_NAME, function () {
                return $this->generateThemeContentDataJson();
            }],
        ] as [$virtualFilePath, $provideContents]) {
            $this->writer->write($virtualFilePath,
                                 $provideContents());
        }
        // @allow \Pike\PikeException
        $data = $this->writer->getResult();
        return $this->crypto->encrypt($data, $signingKey);
    }
    /**
     * @return string
     */
    private function generateDbConfigJson() {
        return json_encode([
            'dbHost' => $this->config['db.host'],
            'dbDatabase' => $this->config['db.database'],
            'dbUser' => $this->config['db.user'],
            'dbPass' => $this->config['db.pass'],
            'dbTablePrefix' => $this->config['db.tablePrefix'],
            'dbCharset' => $this->config['db.charset'],
        ], JSON_UNESCAPED_UNICODE);
    }
    /**
     * @return string
     */
    private function generateWebsiteStateJson($sitePath) {
        return json_encode([
            'siteName' => $this->appState->websiteState->name,
            'siteLang' => $this->appState->websiteState->lang,
            'baseUrl' => RAD_BASE_URL,
            'radPath' => RAD_BASE_PATH,
            'sitePath' => $sitePath,
            'mainQueryVar' => RAD_QUERY_VAR,
            'useDevMode' => boolval(RAD_FLAGS & RAD_DEVMODE),
        ], JSON_UNESCAPED_UNICODE);
    }
    /**
     * @return string '[["Articles", ContentNode[]], ...]'
     */
    private function generateThemeContentDataJson() {
        $out = [];
        foreach ($this->themeContentTypes->toArray() as $ctype) {
            // @allow \Pike\PikeException
            if (!($nodes = $this->cNodeDAO->fetchAll($ctype->name)->exec()))
                continue;
            $out[] = [$ctype->name, $nodes];
        }
        return json_encode($out, JSON_UNESCAPED_UNICODE);
    }
}
