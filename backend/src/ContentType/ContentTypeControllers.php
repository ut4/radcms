<?php

namespace RadCms\ContentType;

use Pike\Request;
use Pike\Response;
use Pike\Validation;
use Pike\ArrayUtils;
use RadCms\CmsState;

/**
 * Handlaa /api/content-types -alkuiset pyynnöt.
 */
class ContentTypeControllers {
    /**
     * POST /api/content-types.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\ContentType\ContentTypeMigrator $migrator
     */
    public function handleCreateContentType(Request $req,
                                            Response $res,
                                            ContentTypeMigrator $migrator) {
        if (($errors = $this->validateInsertInput($req->body))) {
            $res->status(400)->json($errors);
            return;
        }
        // @allow \Pike\PikeException
        $migrator->installSingle($req->body);
        $res->json(['ok' => 'ok']);
    }
    /**
     * GET /api/content-type/:name.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\CmsState $cmsState
     */
    public function handleGetContentType(Request $req,
                                         Response $res,
                                         CmsState $cmsState) {
        $ctype = ArrayUtils::findByKey($cmsState->getContentTypes(),
                                       $req->params->name,
                                       'name');
        if ($ctype) $res->json($ctype);
        else $res->status(404)->json(['got' => 'nothing']);
    }
    /**
     * GET /api/content-type/:filter.
     *
     * @param \Pike\Request $req
     * @param \Pike\Response $res
     * @param \RadCms\CmsState $cmsState
     */
    public function handleGetContentTypes(Request $req,
                                          Response $res,
                                          CmsState $cmsState) {
        $filter = $req->params->filter ?? '';
        $res->json($filter !== 'no-internals'
            ? $cmsState->getContentTypes()->getArrayCopy()
            : ArrayUtils::filterByKey($cmsState->getContentTypes(),
                                      false,
                                      'isInternal')->getArrayCopy());
    }
    /**
     * @return string[]
     */
    private static function validateInsertInput($input) {
        return (Validation::makeObjectValidator())
            ->rule('name', 'identifier')
            ->rule('friendlyName', 'minLength', 1)
            ->rule('isInternal', 'type', 'bool')
            ->rule('fields.*.name', 'identifier')
            ->rule('fields.*.friendlyName', 'minLength', 1)
            ->rule('fields.*.dataType', 'in', ContentTypeValidator::FIELD_DATA_TYPES)
            ->rule('fields.*.defaultValue', 'type', 'string')
            ->rule('fields.*.widget.name', 'in', ContentTypeValidator::FIELD_WIDGETS)
            ->validate($input);
    }
}
