<?php

namespace RadCms\ContentType;

use Pike\Validation;

abstract class ContentTypeValidator {
    const MAX_NAME_LEN = 64;
    const FIELD_WIDGETS = ['textField', 'textArea', 'richText', 'image',
                           'multiFieldBuilder', 'date', 'dateTime',
                           'color', 'contentRef', 'hidden'];
    const FIELD_DATA_TYPES = ['text', 'json', 'int'];
    const COLLECTION_SIZES = ['tiny', 'small', 'medium', '', 'big'];
    /**
     * @param \RadCms\ContentType\ContentTypeDef $contentType
     * @return string[]
     */
    public static function validate(ContentTypeDef $contentType) {
        static $validator = null;
        if (!$validator) $validator = Validation::makeObjectValidator()
            ->rule('fields', 'minLength', 1)
            ->rule('fields.*.name', 'identifier')
            ->rule('fields.*.dataType', 'in', self::FIELD_DATA_TYPES)
            ->rule('fields.*.widget.name', 'in', self::FIELD_WIDGETS);
        return array_merge(
            self::validateName($contentType->name),
            $validator->validate((object)[
                'fields' => $contentType->fields->toArray()
            ])
        );
    }
    /**
     * @param \RadCms\ContentType\ContentTypeCollection $contentTypes
     * @return string[]
     */
    public static function validateAll(ContentTypeCollection $contentTypes) {
        return array_reduce($contentTypes->toArray(), function ($all, $def) {
            return array_merge($all, ContentTypeValidator::validate($def));
        }, []);
    }
    /**
     * @param string $contentTypeName
     * @return string[]
     */
    public static function validateName($contentTypeName) {
        return (Validation::makeValueValidator())
            ->rule('identifier')
            ->rule('maxLength', self::MAX_NAME_LEN)
            ->validate($contentTypeName, 'ContentType.name');
    }
    /**
     * @param \RadCms\ContentType\ContentTypeDef $contentType
     * @param \stdClass $input
     * @param \Closure $additionalChecks = null
     * @return string[]
     */
    public static function validateInsertData(ContentTypeDef $contentType,
                                              $input,
                                              $additionalChecks = null) {
        $v = Validation::makeObjectValidator();
        $v->rule('id?', 'type', 'int');
        $v->rule('isPublished?', 'type', 'bool');
        if ($additionalChecks) $additionalChecks($v);
        foreach ($contentType->fields->toArray() as $f) {
            $validationRuleArgs = [
                'text' => ['type', 'string'],
                'json' => ['type', 'string'],
                'int' => ['type', 'int'],
            ][$f->dataType] ?? null;
            if (!$validationRuleArgs)
                throw new \RuntimeException('Shouldn\'t happen');
            $v->rule($f->name, ...$validationRuleArgs);
        }
        if (!($errors = $v->validate($input))) {
            $input->isPublished = $input->isPublished ?? false;
        }
        return $errors;
    }
    /**
     * @param \RadCms\ContentType\ContentTypeDef $contentType
     * @param \stdClass $input
     * @return string[]
     */
    public static function validateUpdateData(ContentTypeDef $contentType,
                                              $input) {
        return self::validateInsertData($contentType, $input, function ($v) {
            $v->rule('isRevision', 'type', 'bool');
        });
    }
}
