<?php declare(strict_types=1);

namespace RadCms\PluginTestUtils\Internal;

use Pike\{FileSystem, Request, Response, Translator};
use RadCms\{BaseAPI, CmsState};
use RadCms\Content\MagicTemplateDAO;
use RadCms\Templating\MagicTemplate;
use RadCms\Tests\_Internal\TestSite;

final class PluginTestSiteTemplateRenderer {
    /**
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\CmsState $cmsState
     * @param \Pike\Translator $translator
     * @param \RadCms\Content\MagicTemplateDAO $dao
     * @param \Pike\FileSystem $fs
     */
    public function renderTemplate(Request $req,
                                   Response $res,
                                   CmsState $cmsState,
                                   Translator $translator,
                                   MagicTemplateDAO $dao,
                                   FileSystem $fs): void {
        $filePath = TestSite::PUBLIC_PATH .
                    'my-mock-site/' .
                    urldecode($req->params->relativeTemplateFilePath);
        $tmpl = new MagicTemplate($filePath, [], $translator, $dao, $fs);
        $cmsState->getApiConfigs()->applyRegisteredTemplateStuff($tmpl,
            BaseAPI::TARGET_WEBSITE_LAYOUT);
        $res->html($tmpl->render());
    }
}
