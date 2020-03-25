<?php

namespace RadCms\Installer;

use Pike\Db;
use Pike\FileSystemInterface;
use RadCms\ContentType\ContentTypeMigrator;
use Pike\PikeException;
use RadCms\ContentType\ContentTypeCollection;
use RadCms\StockContentTypes\MultiFieldBlobs\MultiFieldBlobs;

/**
 * Asentaa sivuston asennusvelholomakkeen inputista.
 */
class Installer {
    private $db;
    private $fs;
    private $commons;
    private $backendPath;
    private $siteDirPath;
    /**
     * @param \Pike\Db $db
     * @param \Pike\FileSystemInterface $fs
     * @param \RadCms\Installer\InstallerCommons $commons
     */
    public function __construct(Db $db,
                                FileSystemInterface $fs,
                                InstallerCommons $commons) {
        $this->db = $db;
        $this->fs = $fs;
        $this->commons = $commons;
        $this->backendPath = $commons->getBackendPath();
        $this->siteDirPath = $commons->getSiteDirPath();
    }
    /**
     * @param \stdClass $settings Validoitu ja normalisoitu $req->body.
     * @return bool
     * @throws \Pike\PikeException
     */
    public function doInstall($settings) {
        // @allow \Pike\PikeException
        return $this->commons->createOrOpenDb($settings) &&
               $this->commons->createMainSchema($settings,
                                                $this->fs,
                                                "{$this->backendPath}assets/schema.mariadb.sql") &&
               $this->commons->insertMainSchemaData($settings) &&
               $this->commons->createUserZero($settings) &&
               $this->createContentTypesAndInsertInitialData($settings) &&
               $this->copyFiles($settings) &&
               $this->commons->generateConfigFile($settings) &&
               $this->commons->selfDestruct();
    }
    /**
     * @return array
     */
    public function getWarnings() {
        return $this->commons->getWarnings();
    }
    /**
     * @param \stdClass $s settings
     * @return bool
     * @throws \Pike\PikeException
     */
    private function createContentTypesAndInsertInitialData($s) {
        $base = "{$this->backendPath}installer/sample-content/{$s->sampleContent}/";
        $contentTypesFilePath = "{$base}content-types.json";
        $dataFilePath = "{$base}sample-data.json";
        $parsed = [null, null];
        foreach ([$contentTypesFilePath, $dataFilePath] as $i => $filePath) {
            if (!($json = $this->fs->read($filePath)))
                throw new PikeException("Failed to read `{$filePath}`",
                                        PikeException::FAILED_FS_OP);
            if (($parsed[$i] = json_decode($json)) === null)
                throw new PikeException("Failed to parse `{$filePath}`",
                                        PikeException::BAD_INPUT);
        }
        // @allow \Pike\PikeException
        $collection = self::makeContentTypes($parsed[0]);
        // @allow \Pike\PikeException
        return (new ContentTypeMigrator($this->db))->installMany($collection,
                                                                 $parsed[1]);
    }
    /**
     * @return \RadCms\ContentType\ContentTypeCollection
     */
    private static function makeContentTypes($inputContentTypes) {
        return ContentTypeCollection::fromCompactForm(array_map(function ($c) {
            return $c !== 'extend:stockContentTypes' ? $c : MultiFieldBlobs::asCompactForm();
        }, $inputContentTypes));
    }
    /**
     * @param \stdClass $s settings
     * @return bool
     * @throws \Pike\PikeException
     */
    private function copyFiles($s) {
        // @allow \Pike\PikeException
        $this->commons->createSiteDirectories();
        //
        $base = "{$this->backendPath}installer/sample-content/{$s->sampleContent}/";
        // @allow \Pike\PikeException
        $tmplFileNames = $this->readDirRelPaths("{$base}theme/", '/^.*\.tmpl\.php$/');
        $assetFileNames = $this->readDirRelPaths("{$base}theme/frontend/", '/^.*\.(css|js)$/');
        //
        $toBeCopied = [];
        foreach (['site.json', 'README.md'] as $fileName)
            $toBeCopied[] = ["{$base}{$fileName}",
                             "{$this->siteDirPath}{$fileName}"];
        foreach ($tmplFileNames as $relativePath)
            $toBeCopied[] = ["{$base}theme/{$relativePath}",
                             "{$this->siteDirPath}theme/{$relativePath}"];
        foreach ($assetFileNames as $relativePath)
            $toBeCopied[] = ["{$base}theme/frontend/{$relativePath}",
                             "{$this->siteDirPath}theme/{$relativePath}"];
        //
        foreach ($toBeCopied as [$from, $to]) {
            if (!$this->fs->copy($from, $to))
                throw new PikeException("Failed to copy `{$from}` -> `{$to}`",
                                        PikeException::FAILED_FS_OP);
        }
        return true;
    }
    /**
     * @return string[] ['file.php', 'dir/another.php']
     * @throws \Pike\PikeException
     */
    private function readDirRelPaths($dirPath, $filterRegexp) {
        if (($paths = $this->fs->readDirRecursive($dirPath, $filterRegexp))) {
            return array_map(function ($fullFilePath) use ($dirPath) {
                return substr($fullFilePath, mb_strlen($dirPath));
            }, $paths);
        }
        throw new PikeException("Failed to read `{$dirPath} ({$filterRegexp})`",
                                PikeException::FAILED_FS_OP);
    }
}
