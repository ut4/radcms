<?php

declare(strict_types=1);

namespace RadCms\Plugin;

use Pike\FileSystemInterface;
use RadCms\ContentType\{ContentTypeCollection, ContentTypeMigrator};
use RadCms\FileMigrator;

final class MigrationAPI {
    /** @var string */
    private $pluginName;
    /** @var \RadCms\ContentType\ContentTypeMigrator */
    private $contentTypeMigrator;
    /** @var \Pike\FileSystemInterface */
    private $fs;
    /**
     * @param \RadCms\Plugin\Plugin $plugin
     * @param \RadCms\ContentType\ContentTypeMigrator $dataMigrator
     * @param \Pike\FileSystemInterface $fs
     */
    public function __construct(Plugin $plugin,
                                ContentTypeMigrator $dataMigrator,
                                FileSystemInterface $fs) {
        $this->pluginName = $plugin->name;
        $this->contentTypeMigrator = $dataMigrator;
        $this->contentTypeMigrator->setOrigin($plugin);
        $this->fs = $fs;
    }
    /**
     * @param \RadCms\ContentType\ContentTypeCollection $contentTypes
     * @param ?array $initialData = null [['ContentTypeName', [(object)['key' => 'value']...]]...]
     * @return bool
     */
    public function installContentTypes(ContentTypeCollection $contentTypes,
                                        ?array $initialData = null): bool {
        return $this->contentTypeMigrator->installMany($contentTypes, $initialData);
    }
    /**
     * @param \RadCms\ContentType\ContentTypeCollection $contentTypes
     * @return bool
     */
    public function uninstallContentTypes(ContentTypeCollection $contentTypes): bool {
        return $this->contentTypeMigrator->uninstallMany($contentTypes);
    }
    /**
     * Kopioi kaikki tiedostot <workspacePath>/plugins/PluginName/$fromDir -kansiosta <publicPath>/frontend/plugins/pluginname -kansioon.
     *
     * @param string $fromDir
     */
    public function copyPublicAssets(string $fromDir): void {
        $fm = new FileMigrator($this->fs,
            RAD_WORKSPACE_PATH . "plugins/{$this->pluginName}/",
            RAD_PUBLIC_PATH . "frontend/plugins/" . strtolower($this->pluginName) . "/"
        );
        // @allow \Pike\PikeException
        $fm->copyFiles($fm::fromTo($fromDir, // <workspacePath>/plugins/PluginName/$fromDir
                                   ''));     // <publicPath>/frontend/plugins/pluginname
    }
}
