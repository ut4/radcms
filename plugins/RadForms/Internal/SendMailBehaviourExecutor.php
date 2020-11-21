<?php declare(strict_types=1);

namespace RadPlugins\RadForms\Internal;

use Pike\{ArrayUtils, PikeException, Validation};
use Pike\Interfaces\MailerInterface;
use RadCms\CmsState;
use RadPlugins\RadForms\RadForms;

/**
 * Validoi ja prosessoi lomakkeen behaviours-jsoniin määritellyn {type: 'SendMail' ...}
 * -behaviourin.
 */
final class SendMailBehaviourExecutor {
    /**
     * @param object $behaviourFromDb
     * @param object $reqBody
     * @param \RadPlugins\RadForms\Internal\DefaultServicesFactory $services
     * @param string $formId
     */
    public static function validateAndApply(object $behaviourFromDb,
                                            object $reqBody,
                                            DefaultServicesFactory $services,
                                            string $formId): void {
        if (($errors = self::validateBehaviour($behaviourFromDb)))
            throw new PikeException(implode("\n", $errors), PikeException::BAD_INPUT);
        // @allow \Pike\PikeException
        (new self($services->makeMailer(), $services->getCmsState()))
            ->process($behaviourFromDb, $reqBody, $formId);
    }
    /**
     * @param object $behaviourFromDb
     * @return string[] Virheviestit tai []
     */
    private static function validateBehaviour(object $behaviourFromDb): array {
        return Validation::makeObjectValidator()
            ->rule('subjectTemplate', 'type', 'string')
            ->rule('subjectTemplate', 'maxLength', 128)
            ->rule('bodyTemplate', 'type', 'string')
            ->rule('fromAddress', 'type', 'string')
            ->rule('fromName?', 'type', 'string')
            ->rule('toAddress', 'type', 'string')
            ->rule('toName?', 'type', 'string')
            ->validate($behaviourFromDb);
    }

    //

    /** @var \Pike\Interfaces\MailerInterface */
    private $mailer;
    /** @var \RadCms\CmsState */
    private $cmsState;
    /**
     * @param \Pike\Interfaces\MailerInterface $mailer
     * @param \RadCms\CmsState $cmsState
     */
    public function __construct(MailerInterface $mailer, CmsState $cmsState) {
        $this->mailer = $mailer;
        $this->cmsState = $cmsState;
    }
    /**
     * @param object $behaviour Validoitu behaviour tietokannasta
     * @param object $reqBody Devaajan määrittelemän lomakkeen lähettämä data
     * @param string $formId Tietokannasta palautetun lähetettävän lomake-entiteetin id
     */
    public function process(object $behaviour, object $reqBody, string $formId): void {
        $errors = [];
        if (($errors = self::validateReqBodyForTemplate($reqBody)))
            throw new PikeException(implode("\n", $errors), PikeException::BAD_INPUT);
        $vars = $this->makeTemplateVars($reqBody);
        // @allow \Pike\PikeException, \PHPMailer\PHPMailer\Exception
        $this->mailer->sendMail((object) [
            'fromAddress' => $behaviour->fromAddress,
            'fromName' => is_string($behaviour->fromName ?? null) ? $behaviour->fromName : '',
            'toAddress' => $behaviour->toAddress,
            'toName' => is_string($behaviour->toName ?? null) ? $behaviour->toName : '',
            'subject' => self::renderTemplate($behaviour->subjectTemplate, $vars),
            'body' => self::renderTemplate($behaviour->bodyTemplate, $vars),
            'configureMailer' => function ($phpMailer) use($formId) {
                $this->cmsState->getApiConfigs()->triggerEvent(
                    RadForms::ON_MAILER_CONFIGURE,
                    $phpMailer,
                    $formId);
            },
        ]);
    }
    /**
     * @param object $reqBody
     * @return string[] Virheviestit tai []
     */
    private static function validateReqBodyForTemplate(object $reqBody): array {
        $unrolled = new \stdClass;
        $v = Validation::makeObjectValidator();
        $i = 0;
        foreach ($reqBody as $key => $val) {
            if ($key[0] === '_') continue;
            $unrolled->{"template-var-keys-#{$i}"} = $key;
            $unrolled->{"template-var-values-#{$i}"} = $val;
            $v->rule("template-var-keys-#{$i}", 'identifier');
            $v->rule("template-var-values-#{$i}", 'type', 'string');
            $v->rule("template-var-values-#{$i}", 'maxLength', 6000);
            ++$i;
        }
        return $i ? $v->validate($unrolled) : ["Form template must contain at least one input"];
    }
    /**
     * @param object $reqBody Validoitu devaajan määrittelemän lomakkeen lähettämä data
     * @return object Oletusmuuttujat (esim. siteName) ja lomakkeen lähettämä data mergettynä
     */
    private function makeTemplateVars(object $reqBody): object {
        $combined = (object) [
            'siteName' => $this->cmsState->getSiteInfo()->name,
            'siteLang' => $this->cmsState->getSiteInfo()->lang,
        ];
        foreach ($reqBody as $key => $val) {
            if ($key[0] !== '_') $combined->{$key} = $val;
        }
        return $combined;
    }
    /**
     * @param string $tmpl Devaajan määrittelemä templaatti
     * @param object $vars ks. self::makeTemplateVars()
     * @return string
     */
    private static function renderTemplate(string $tmpl, object $vars): string {
        foreach ($vars as $key => $val)
            $tmpl = str_replace("[{$key}]", htmlentities($val), $tmpl);
        return $tmpl;
    }
}
