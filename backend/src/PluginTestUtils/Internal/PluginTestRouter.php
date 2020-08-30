<?php declare(strict_types=1);

namespace RadCms\PluginTestUtils\Internal;

use Pike\Router;
use RadCms\Auth\ACL;

class PluginTestRouter extends Router {
    /**
     * @inheritdoc
     */
	public function __construct($routes = [],
                                $basePath = '',
                                $matchTypes = []) {
        parent::__construct($routes, $basePath, $matchTypes);
        $this->map('PSEUDO', '/plugin-utils/render-template/[*:relativeTemplateFilePath]',
            [PluginTestSiteTemplateRenderer::class, 'renderTemplate', ACL::NO_IDENTITY]
        );
	}
}
