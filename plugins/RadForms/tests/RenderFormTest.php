<?php declare(strict_types=1);

namespace RadPlugins\RadForms\Tests;

use Laminas\Dom\Query;

final class RenderFormTest extends RadFormsTestCase {
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
    private function renderTestPage(object $state): void {
        $app = $this->makePluginTestApp();
        $state->renderedHtml = $this->renderTemplate('my-contact-page.tmpl.php', $app);
    }
    private function verifyRenderedForm(object $state): void {
        $dom = new Query($state->renderedHtml);
        $this->assertCount(1, $dom->execute('form'), 'Pitäisi renderöidä lomake');       
    }
}
