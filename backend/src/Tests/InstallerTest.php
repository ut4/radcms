<?php

namespace Rad\Tests;

use RadCms\Installer\InstallerApp;
use PHPUnit\Framework\TestCase;
use RadCms\Request;
use RadCms\Tests\Common\HttpTestUtils;


final class InstallerTest extends TestCase {
    use HttpTestUtils;
    public function testInstallerValidatesMissingValues() {
        $app = InstallerApp::create();
        //
        $input = (object)['sampleContent' => 'test-content', 'dbCharset' => 'utf8'];
        $res = $this->createMockResponse(json_encode([
            'baseUrl !present',
            'radPath !present',
            'dbHost !present',
            'dbUser !present',
            'dbPass !present',
            'dbDatabase !present',
            'dbTablePrefix !present',
        ]), 400);
        $app->handleRequest(new Request('/', 'POST', $input), $res);
    }
    public function testInstallerValidatesInvalidValues() {
        $app = InstallerApp::create();
        //
        $input = (object)[
            'baseUrl' => [],
            'radPath' => 'notValid',
            'sampleContent' => 'foo',
            'dbHost' => [],
            'dbUser' => [],
            'dbPass' => [],
            'dbDatabase' => [],
            'dbTablePrefix' => [],
            'dbCharset' => 'notValid',
        ];
        $res = $this->createMockResponse(json_encode([
            'baseUrl !present',
            'radPath !srcDir',
            'sampleContent !in',
            'dbHost !present',
            'dbUser !present',
            'dbPass !present',
            'dbDatabase !present',
            'dbTablePrefix !present',
            'dbCharset !in',
        ]), 400);
        $app->handleRequest(new Request('/', 'POST', $input), $res);
    }
    public function testInstallerFillsDefaultValues() {
        $app = InstallerApp::create();
        //
        $input = (object)[
            'baseUrl' => 'foo',
            'radPath' => dirname(dirname(__DIR__)),
            'sampleContent' => 'test-content',
            'dbHost' => 'locahost',
            'dbUser' => 'test',
            'dbPass' => 'pass',
            'dbDatabase' => 'name',
            'dbTablePrefix' => 'p_',
        ];
        $res = $this->createMockResponse('{"ok":"ok"}');
        $app->handleRequest(new Request('/', 'POST', $input), $res);
        $this->assertEquals('My Site', $input->siteName);
        $this->assertEquals('foo/', $input->baseUrl);
        $this->assertEquals('utf8', $input->dbCharset);
    }
}
