<?php

namespace Rad\Tests;

use RadCms\Installer\InstallerApp;
use PHPUnit\Framework\TestCase;
use RadCms\Request;
use RadCms\Tests\Common\HttpTestUtils;

final class InstallerTest extends TestCase {
    use HttpTestUtils;
    public function testInstallerFoo() {
        $app = InstallerApp::create();
        $res = $this->createMockResponse('{"ok":"ok"}');
        $app->handleRequest(new Request('/', 'POST', (object)['a'=>'b']), $res);
    }
}
