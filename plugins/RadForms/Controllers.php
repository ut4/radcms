<?php declare(strict_types=1);

namespace RadPlugins\RadForms;

use Pike\{PikeException, Request, Response, Validation};
use RadCms\Content\DAO;
use RadCms\Templating\MagicTemplate;
use RadPlugins\RadForms\Internal\{DefaultServicesFactory, SendMailBehaviourExecutor};

final class Controllers {
    /**
     * POST /plugins/rad-forms/handle-submit/[i:formId]
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\Content\DAO $dao
     * @param \RadPlugins\RadForms\Internal\DefaultServicesFactory $services
     */
    public function processFormSubmit(Request $req,
                                      Response $res,
                                      DAO $dao,
                                      DefaultServicesFactory $services): void {
        //
        if (($errors = self::validateSubmitInput($req->body)))
            throw new PikeException(implode("\n", $errors), PikeException::BAD_INPUT);
        //
        $form = $dao->fetchOne('RadForms')->where('id = ?', $req->params->formId)->exec();
        if (!$form) throw new PikeException("Form #{$req->params->formId} not found",
                                            PikeException::BAD_INPUT);
        elseif (($form->behaviours = json_decode($form->behaviours)) === null)
            throw new PikeException("Corrupt data", PikeException::BAD_INPUT);
        //
        if (!$form->behaviours)
            throw new PikeException('Nothing to process', PikeException::BAD_INPUT);
        //
        foreach ($form->behaviours as $behaviour) {
            if ($behaviour->name === 'SendMail')
                SendMailBehaviourExecutor::validateAndApply($behaviour->data, $req->body,
                    $services, $form->id);
            elseif ($behaviour->name === 'NotifyUser' && is_string($req->body->_todo))
                'todo';
        }
        $res->redirect(MagicTemplate::makeUrl($req->body->_returnTo));
    }
    /**
     * @access private
     */
    private static function validateSubmitInput(object $input): array {
        return Validation::makeObjectValidator()
            ->rule('_returnTo', 'type', 'string')
            ->rule('_returnTo', 'maxLength', 256)
            ->validate($input);
    }
}


