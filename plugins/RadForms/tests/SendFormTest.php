<?php declare(strict_types=1);

namespace RadPlugins\RadForms\Tests;

use Pike\{PikeException, Request};
use Pike\Interfaces\MailerInterface;
use RadCms\Templating\MagicTemplate;
use RadPlugins\RadForms\Internal\{DefaultServicesFactory};

final class SendFormTest extends RadFormsTestCase {
    public function testProcessFormValidatesInput(): void {
        $state = $this->setupValidateTest();
        $this->expectException(PikeException::class);
        $this->expectExceptionMessage(implode("\n", [
            '_returnTo must be string',
            'The length of _returnTo must be 256 or less',
        ]));
        $this->sendProcessFormSubmitRequest($state);
    }
    private function setupValidateTest(): object {
        $state = $this->setupSendMailTest();
        $state->testFormInsertId = '1';
        $state->reqBody = (object) [];
        return $state;
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testProcessFormSubmitRejectsIfNoFormWasFound(): void {
        $state = $this->setupSendMailTest();
        $state->testFormInsertId = '99';
        $this->expectException(PikeException::class);
        $this->expectExceptionMessage("Form #{$state->testFormInsertId} not found");
        $this->sendProcessFormSubmitRequest($state);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testProcessFormValidatesUserDefinedFormData(): void {
        $state = $this->setupSendMailTest();
        $state->reqBody->{'not v4lid identifier'} = 'foo';
        $state->reqBody->wayTooLongValue = str_repeat('-', 6001);
        $this->insertTestFormToDb($state);
        $this->expectException(PikeException::class);
        $this->expectExceptionMessage(implode("\n", [
            'template-var-keys-#0 must contain only [a-zA-Z0-9_] and start with [a-zA-Z_]',
            'The length of template-var-values-#1 must be 6000 or less',
        ]));
        $this->sendProcessFormSubmitRequest($state);
    }


    ////////////////////////////////////////////////////////////////////////////


    public function testProcessFormSubmitSendsEmail(): void {
        $state = $this->setupSendMailTest();
        $state->reqBody->sender = 'Joku';
        $state->reqBody->message = '<script>Viesti</script>';
        $this->insertTestFormToDb($state);
        $this->sendProcessFormSubmitRequest($state);
        $this->verifySentMail($state);
        $this->verifyRedirectedToReturnUrl($state);
    }
    private function setupSendMailTest(): object {
        $state = new \stdClass;
        $state->testFormBehaviours = [(object) [
            'name' => 'SendMail',
            'data' => (object) [
                'fromAddress' => 'foo@foo.foo',
                'toAddress' => 'bar@bar.bar',
                'subjectTemplate' => 'Viesti sivustolta [siteName]',
                'bodyTemplate' => '[sender] sivustolta [siteName] kirjoitti: [message]'
            ],
        ]];
        $state->reqBody = (object) [
            '_returnTo' => '/',
        ];
        $state->testFormInsertId = null;
        $state->spyingResponse = null;
        return $state;
    }
    private function sendProcessFormSubmitRequest(object $state): void {
        $app = $this->makePluginTestApp(function ($injector) use ($state) {
            $injector->define(DefaultServicesFactory::class, [
                ':makeMailerFn' => function () use ($state) { return $this->makeSpyingMailer($state); }
            ]);
        });
        $req = new Request("/plugins/rad-forms/handle-submit/{$state->testFormInsertId}",
                           'POST',
                           $state->reqBody);
        $state->spyingResponse = $this->makeSpyingResponse();
        $this->sendRequest($req, $state->spyingResponse, $app);
    }
    private function makeSpyingMailer($state) {
        $mailer = $this->createMock(MailerInterface::class);
        $mailer->method('sendMail')->with($this->callback(function ($mailSettings) use ($state) {
            $state->sendMailCallArgs[] = $mailSettings;
            return true;
        }));
        return $mailer;
    }
    private function verifySentMail(object $state): void {
        $this->assertCount(1, $state->sendMailCallArgs);
        $behaviourData = $state->testFormBehaviours[0]->data;
        $actualSiteInfo = $this->getSiteInfo();
        $expectedTemplateVars = array_merge((array) $state->reqBody,
                                            ['siteName' => $actualSiteInfo->name]);
        $this->assertEquals((object) [
            'fromAddress' => 'foo@foo.foo',
            'fromName' => '',
            'toAddress' => 'bar@bar.bar',
            'toName' => '',
            'subject' => self::renderMailTemplate($behaviourData->subjectTemplate,
                                                  $expectedTemplateVars),
            'body' => self::renderMailTemplate($behaviourData->bodyTemplate,
                                               $expectedTemplateVars),
        ], $state->sendMailCallArgs[0]);
    }
    private function verifyRedirectedToReturnUrl(object $state): void {
        $actual = $state->spyingResponse->getActualHeader('Location');
        $this->assertNotNull($actual, 'Pitäisi asettaa Location-header');
        [$_name, $value, $_doReplace, $_isPermanent] = $actual;
        $this->assertEquals(MagicTemplate::makeUrl($state->reqBody->_returnTo),
                            $value);
    }
    private static function renderMailTemplate(string $str, array $replacements): string {
        foreach ($replacements as $from => $to)
            $str = str_replace("[{$from}]", htmlentities($to), $str);
        return $str;
    }
}
