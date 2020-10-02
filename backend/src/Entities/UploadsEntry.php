<?php

declare(strict_types=1);

namespace RadCms\Entities;

final class UploadsEntry {
    /** @var string e.g. 'a-cat.png' */
    public $fileName;
    /** @var string '/var/www/html/uploads/' */
    public $basePath;
    /** @var string */
    public $mime;
    /** @var ?string */
    public $friendlyName;
    /** @var int */
    public $createdAt;
    /** @var int */
    public $updatedAt;
}
