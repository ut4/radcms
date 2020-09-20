<?php declare(strict_types=1);

namespace RadPlugins\RadForms\Internal;

use Pike\{AbstractMailer, PhpMailerMailer};
use RadCms\CmsState;

class DefaultServicesFactory {
    /** @var \RadCms\CmsState */
    private $cmsState;
    /** @var ?callable */
    private $makeMailerFn;
    public function __construct(CmsState $cmsState,
                                ?callable $makeMailerFn = null) {
        $this->cmsState = $cmsState;
        $this->makeMailerFn = $makeMailerFn;
    }
    public function makeSiteInfo(): \stdClass {
        return $this->cmsState->getSiteInfo();
    }
    public function makeMailer(): AbstractMailer {
        return !$this->makeMailerFn ? new PhpMailerMailer : call_user_func($this->makeMailerFn);
    }
}
