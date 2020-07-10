<?php

declare(strict_types=1);

namespace RadCms\Installer;

use Pike\{Db, FileSystemInterface, PikeException};
use RadCms\ContentType\{ContentTypeMigrator, ContentTypeCollection};
use RadCms\StockContentTypes\MultiFieldBlobs\MultiFieldBlobs;

/**
 * Asentaa sivuston asennusvelholomakkeen inputista.
 */
class Installer {
    private $db;
    private $fs;
    private $commons;
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
    }
    /**
     * @param \stdClass $settings Validoitu ja normalisoitu $req->body.
     * @return string $workspacePathWhereSiteWasInstalledTo tai ''
     * @throws \Pike\PikeException
     */
    public function doInstall(\stdClass $settings): string {
        // @allow \Pike\PikeException
        $ok = $this->commons->createOrOpenDb($settings) &&
            $this->commons->createMainSchema($settings) &&
            $this->commons->insertMainSchemaData($settings) &&
            $this->commons->createUserZero($settings) &&
            $this->createContentTypesAndInsertInitialData($settings) &&
            ($workspaceDir = $this->copyFiles($settings)) &&
            $this->commons->generateConfigFile($settings) &&
            $this->commons->selfDestruct();
        return $ok ? $workspaceDir : '';
    }
    /**
     * @return string[]
     */
    public function getWarnings(): array {
        return $this->commons->getWarnings();
    }
    /**
     * @param \stdClass $s settings
     * @return bool
     * @throws \Pike\PikeException
     */
    private function createContentTypesAndInsertInitialData(\stdClass $s): bool {
        $base = "{$this->commons->getBackendDirPath()}installer/sample-content/{$s->sampleContent}/";
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
     * @param array $inputContentTypes
     * @return \RadCms\ContentType\ContentTypeCollection
     */
    private static function makeContentTypes(array $inputContentTypes): ContentTypeCollection {
        return ContentTypeCollection::fromCompactForm(array_map(function ($c) {
            return $c !== 'extend:stockContentTypes' ? $c : MultiFieldBlobs::asCompactForm();
        }, $inputContentTypes));
    }
    /**
     * @param \stdClass $s settings
     * @return string
     * @throws \Pike\PikeException
     */
    private function copyFiles(\stdClass $s): string {
        // @allow \Pike\PikeException
        [$workspaceDir, $publicDir] = $this->commons->createPublicAndWorkspaceDirs();
        //
        $base = "{$this->commons->getBackendDirPath()}installer/sample-content/{$s->sampleContent}/";
        // @allow \Pike\PikeException
        $workspaceFiles = $this->readDirRelPaths("{$base}site/", '/.*/');
        $frontendFiles = $this->readDirRelPaths("{$base}frontend/", '/.*/');
        $toBeCopied = [];
        foreach ($workspaceFiles as $relativePath)
            $toBeCopied[] = ["{$base}site/{$relativePath}",
                             "{$workspaceDir}site/{$relativePath}"];
        foreach ($frontendFiles as $relativePath)
            $toBeCopied[] = ["{$base}frontend/{$relativePath}",
                             "{$publicDir}frontend/{$relativePath}"];
        foreach ($toBeCopied as [$from, $to]) {
            if (!$this->fs->copy($from, $to))
                throw new PikeException("Failed to copy `{$from}` -> `{$to}`",
                                        PikeException::FAILED_FS_OP);
        }
        return $workspaceDir;
    }
    /**
     * @return string[] ['file.php', 'dir/another.php']
     * @throws \Pike\PikeException
     */
    private function readDirRelPaths(string $dirPath, string $filterRegexp): array {
        if (($paths = $this->fs->readDirRecursive($dirPath, $filterRegexp,
            \FilesystemIterator::CURRENT_AS_PATHNAME|\FilesystemIterator::SKIP_DOTS))) {
            return array_map(function ($fullFilePath) use ($dirPath) {
                return substr($fullFilePath, mb_strlen($dirPath));
            }, $paths);
        }
        throw new PikeException("Failed to read `{$dirPath} ({$filterRegexp})`",
                                PikeException::FAILED_FS_OP);
    }
}
