<?php

declare(strict_types=1);

namespace RadCms\Installer;

use Pike\{Db, PikeException};
use Pike\Interfaces\FileSystemInterface;
use RadCms\ContentType\{ContentTypeMigrator, ContentTypeCollection};
use RadCms\FileMigrator;
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
     * @param \Pike\Interfaces\FileSystemInterface $fs
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
        $base = "{$this->commons->getBackendDirPath()}installer/sample-content/{$s->sampleContent}/";
        $fm = new FileMigrator($this->fs, $base, $workspaceDir);
        $fm2 = new FileMigrator($this->fs, $base, $publicDir);
        // // @allow \Pike\PikeException
        $fm->copyFiles($fm->fromTo('site', 'site'));
        // // @allow \Pike\PikeException
        $fm2->copyFiles($fm->fromTo('frontend', 'frontend'));
        return $workspaceDir;
    }
}
