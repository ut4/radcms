<?php

namespace RadCms\Tests\_Internal;

abstract class TestSite {
    public const DIRNAME = TEST_SITE_DIRNAME;
    public const PUBLIC_PATH = TEST_SITE_PUBLIC_PATH;
    public const TMPL_1_PATH = 'templates/test-layout.tmpl.php';
    public const TMPL_2_PATH = 'templates/my-tags/MyTag.tmpl.php';
    public const ASSET_1_PATH = 'test-style.css';
    public const ASSET_2_PATH = 'my-js/test-script.js';
    public const UPLOAD_ITEM_1_PATH = 'uploads/sample.jpg';
    public const TEMPLATES = [self::TMPL_1_PATH, self::TMPL_2_PATH];
    public const ASSETS = [self::ASSET_1_PATH, self::ASSET_2_PATH];
    public const UPLOADS = [self::UPLOAD_ITEM_1_PATH];
    public const DIRS = ['templates/my-tags', 'templates', 'my-js'];
}
