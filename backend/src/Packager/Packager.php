<?php

namespace RadCms\Packager;

use RadCms\Framework\FileSystemInterface;
use RadCms\Common\RadException;
use RadCms\AppState;
use RadCms\Content\DAO;
use RadCms\Framework\Db;
use RadCms\Auth\Crypto;

class Packager {
    public const MAIN_SCHEMA_VIRTUAL_FILE_NAME = 'create-main-schema-tables.sql';
    /** @var \RadCms\Packager\PackageStreamInterface */
    private $writer;
    /** @var \RadCms\Auth\Crypto */
    private $crypto;
    /** @var \RadCms\AppState */
    private $appState;
    /** @var \RadCms\Framework\FileSystemInterface */
    private $fs;
    /** @var \RadCms\Content\DAO */
    private $cNodeDAO;
    /** @var object */
    private $config;
    /**
     * @param \RadCms\Packager\PackageStreamInterface $writer
     * @param \RadCms\Auth\Crypto $crypto
     * @param \RadCms\AppState $appState
     * @param \RadCms\Framework\Db $db
     * @param \RadCms\Framework\FileSystemInterface $fs
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
        $this->cNodeDAO = new DAO($db, $state->contentTypes);
        $this->config = include RAD_SITE_PATH . 'config.php';
    }
    /**
     * @param string $sitePath
     * @param string $key
     * @throws \RadCms\Common\RadException
     */
    public function packSite($sitePath, $key) {
        // @allow \RadCms\Common\RadException
        $this->writer->open('');
        //
        foreach ([
            [self::MAIN_SCHEMA_VIRTUAL_FILE_NAME, function () {
                return $this->generateMainSchemaSql();
            }],
        ] as [$virtualFilePath, $provideContents]) {
            $this->writer->write($virtualFilePath,
                                 $provideContents());
        }
        return $this->writer->getResult();
    }
    /**
     * @return string
     * @throws \RadCms\Common\RadException
     */
    private function generateMainSchemaSql() {
        if (($contents = $this->fs->read(RAD_BASE_PATH . 'main-schema.mariadb.sql'))) {
            $contents = str_replace('${database}', $this->config['db.database'], $contents);
            return $contents;
        }
        throw new RadException('Failed to read ' . RAD_BASE_PATH .
                               ' schema.mariadb.sql', RadException::FAILED_FS_OP);
    }
}
