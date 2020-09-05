<?php declare(strict_types=1);

namespace RadPlugins\RadForms\Internal;

use Pike\{AbstractMailer, PikeException, Validation};

/**
 * Validoi ja prosessoi lomakkeen behaviours-jsoniin määritellyn {type: 'SendMail' ...}
 * -behaviourin.
 */
final class SendMailBehaviourExecutor {
    /**
     * @param object $behaviourFromDb
     * @param object $reqBody
     * @param \RadPlugins\RadForms\Internal\DefaultServicesFactory $services
     */
    public static function validateAndApply(object $behaviourFromDb,
                                            object $reqBody,
                                            DefaultServicesFactory $services): void {
        if (($errors = self::validateBehaviour($behaviourFromDb)))
            throw new PikeException(implode("\n", $errors), PikeException::BAD_INPUT);
        // @allow \Pike\PikeException
        (new self($services->makeMailer()))
            ->process($behaviourFromDb, $reqBody);
    }
    /**
     * @param object $behaviourFromDb
     * @return string[] Virheviestit tai []
     */
    private static function validateBehaviour(object $behaviourFromDb): array {
        return Validation::makeObjectValidator()
            ->rule('subject', 'type', 'string')
            ->rule('subject', 'maxLength', 128)
            ->rule('bodyTemplate', 'type', 'string')
            ->rule('fromAddress', 'type', 'string')
            ->rule('fromName?', 'type', 'string')
            ->rule('toAddress', 'type', 'string')
            ->rule('toName?', 'type', 'string')
            ->validate($behaviourFromDb);
    }

    //

    /** @var \Pike\AbstractMailer */
    private $mailer;
    /**
     * @param \Pike\AbstractMailer $mailer
     */
    public function __construct(AbstractMailer $mailer) {
        $this->mailer = $mailer;
    }
    /**
     * @param object $behaviour Validoitu behaviour tietokannasta
     * @param object $reqBody Devaajan määrittelemän lomakkeen lähettämä data
     */
    public function process(object $behaviour, object $reqBody): void {
        if (($errors = self::validateReqBodyForTemplate($reqBody)))
            throw new PikeException(implode("\n", $errors), PikeException::BAD_INPUT);
        // @allow \Pike\PikeException, \PHPMailer\PHPMailer\Exception
        $this->mailer->sendMail((object) [
            'fromAddress' => $behaviour->fromAddress,
            'fromName' => is_string($behaviour->fromName ?? null) ? $behaviour->fromName : '',
            'toAddress' => $behaviour->toAddress,
            'toName' => is_string($behaviour->toName ?? null) ? $behaviour->toName : '',
            'subject' => $behaviour->subject,
            'body' => self::renderTemplate($behaviour->bodyTemplate, $reqBody),
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
     * @param string $tmpl Devaajan määrittelemä templaatti
     * @param object $reqBody Validoitu devaajan määrittelemän lomakkeen lähettämä data
     * @return string
     */
    private static function renderTemplate(string $tmpl, object $reqBody): string {
        foreach ($reqBody as $key => $val) {
            if ($key[0] === '_') continue;
            $tmpl = str_replace("[{$key}]", htmlentities($val), $tmpl);
        }
        return $tmpl;
    }
}
