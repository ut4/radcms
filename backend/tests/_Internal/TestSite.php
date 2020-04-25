<?php

namespace RadCms\Tests\_Internal;

abstract class TestSite {
    public const DIRNAME = TEST_SITE_DIRNAME;
    public const PUBLIC_PATH = TEST_SITE_PUBLIC_PATH;
    public const TMPL_PATH_1 = 'templates/test-layout.tmpl.php';
    public const TMPL_PATH_2 = 'templates/my-tags/MyTag.tmpl.php';
    public const ASSET_PATH_1 = 'test-style.css';
    public const ASSET_PATH_2 = 'my-js/test-script.js';
    public const TEMPLATES = [self::TMPL_PATH_1, self::TMPL_PATH_2];
    public const ASSETS = [self::ASSET_PATH_1, self::ASSET_PATH_2];
    public const DIRS = ['templates/my-tags', 'templates', 'my-js'];
}
