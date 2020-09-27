<?php

declare(strict_types=1);

namespace RadCms;

final class AppContext extends \Pike\AppContext {
    /** \RadCms\CmsState */
    public $cmsState;
    /** \Pike\Translator */
    public $translator;
}
