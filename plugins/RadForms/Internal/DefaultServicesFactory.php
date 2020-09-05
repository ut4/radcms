<?php declare(strict_types=1);

namespace RadPlugins\RadForms\Internal;

use Pike\{AbstractMailer, PhpMailerMailer};

class DefaultServicesFactory {
    public function makeMailer(): AbstractMailer {
        return new PhpMailerMailer;
    }
}
