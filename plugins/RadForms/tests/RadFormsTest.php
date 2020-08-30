<?php declare(strict_types=1);

namespace RadPlugins\RadForms\Tests;

use Laminas\Dom\Query;
use RadCms\PluginTestUtils\PluginTestCase;
use RadPlugins\RadForms\Tests\Internal\Vars;

final class RadFormsTest extends PluginTestCase {
    public function testRadFormTagFetchesFormFromDbAndRendersIt(): void {
        $state = $this->setupRenderTest();
        $this->insertTestFormToDb($state);
        $this->renderTestPage($state);
        $this->verifyRenderedForm($state);
    }
    private function setupRenderTest(): object {
        $state = new \stdClass;
        $state->renderedHtml = null;
        return $state;
    }
    private function insertTestFormToDb(object $state): void {
        self::$db->exec('INSERT INTO `${p}Forms` (`name`,`behaviours`) VALUES (?,?)',
                        [Vars::TEST_FORM_NAME, '{}']);
    }
    private function renderTestPage(object $state): void {
        $state->renderedHtml = $this->renderTemplate('my-contact-page.tmpl.php');
    }
    private function verifyRenderedForm(object $state): void {
        $dom = new Query($state->renderedHtml);
        $this->assertCount(1, $dom->execute('form'), 'Pitäisi renderöidä lomake');       
    }
}
