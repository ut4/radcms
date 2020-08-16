<?php

declare(strict_types=1);

namespace RadCms\ContentType;

use Pike\{ObjectValidator, Validation};
use RadCms\Content\DAO;

abstract class ContentTypeValidator {
    const FIELD_WIDGETS = ['textField', 'textArea', 'richText', 'imagePicker',
                           'multiField', 'datePicker', 'dateTimePicker',
                           'colorPicker', 'contentSelector', 'hidden'];
    const FIELD_DATA_TYPES = ['text', 'json', 'int', 'uint'];
    const COLLECTION_SIZES = ['tiny', 'small', 'medium', '', 'big'];
    private const MAX_NAME_LEN = 64;
    private const MAX_DESCRIPTION_LENGTH = 512;
    private const MAX_FIELD_DEFAULT_VALUE_LENGTH = 2048;
    private const MAX_FRIENDLY_NAME_LENGTH = 128;
    /**
     * @param \RadCms\ContentType\ContentTypeDef $contentType
     * @param bool $doValidateFields = true
     * @return string[]
     */
    public static function validate(ContentTypeDef $contentType,
                                    $doValidateFields = true): array {
        static $validator = null;
        if (!$validator) $validator = Validation::makeObjectValidator()
            ->rule('name', 'identifier')
            ->rule('name', 'maxLength', self::MAX_NAME_LEN)
            ->rule('friendlyName', 'minLength', 1)
            ->rule('friendlyName', 'maxLength', self::MAX_FRIENDLY_NAME_LENGTH)
            ->rule('description', 'maxLength', self::MAX_DESCRIPTION_LENGTH)
            ->rule('isInternal', 'type', 'bool');
        static $fieldsValidator = null;
        if ($doValidateFields &&
            !$fieldsValidator) $fieldsValidator = Validation::makeObjectValidator()
            ->rule('fields', 'minLength', 1, 'array')
            ->rule('fields.*.name', 'identifier')
            ->rule('fields.*.name', 'maxLength', ContentTypeValidator::MAX_NAME_LEN)
            ->rule('fields.*.friendlyName', 'minLength', 1)
            ->rule('fields.*.friendlyName', 'maxLength', self::MAX_FRIENDLY_NAME_LENGTH)
            ->rule('fields.*.dataType', 'in', ContentTypeValidator::FIELD_DATA_TYPES)
            ->rule('fields.*.defaultValue', 'maxLength', self::MAX_FIELD_DEFAULT_VALUE_LENGTH)
            ->rule('fields.*.visibility', 'type', 'int')
            ->rule('fields.*.widget.name', 'in', ContentTypeValidator::FIELD_WIDGETS)
            ->rule('fields.*.widget.args?', 'type', 'object');
        return $doValidateFields
            ? array_merge($validator->validate($contentType),
                          $fieldsValidator->validate($contentType))
            : $validator->validate($contentType);
    }
    /**
     * @param \RadCms\ContentType\ContentTypeCollection $contentTypes
     * @return string[]
     */
    public static function validateAll(ContentTypeCollection $contentTypes): array {
        return array_reduce($contentTypes->getArrayCopy(), function ($all, $def) {
            return array_merge($all, self::validate($def));
        }, []);
    }
    /**
     * @param string $contentTypeName
     * @return string[]
     */
    public static function validateName(string $contentTypeName): array {
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
                                              \stdClass $input,
                                              \Closure $additionalChecks = null): array {
        $v = Validation::makeObjectValidator();
        $v->rule('id?', 'type', 'string');
        $v->rule('status?', 'max', DAO::STATUS_DRAFT);
        if ($additionalChecks) $additionalChecks($v);
        foreach ($contentType->fields as $f) {
            $rules = [
                'text' => [['type', 'string']],
                'json' => [['type', 'string']],
                'int' => [['type', 'number']],
                'uint' => [['type', 'number'], ['min', 0]],
            ][$f->dataType] ?? null;
            if (!$rules)
                throw new \RuntimeException('Shouldn\'t happen');
            foreach ($rules as $ruleArgs)
                $v->rule("{$f->name}?", ...$ruleArgs);
        }
        if (!($errors = $v->validate($input))) {
            $input->status = $input->status ?? DAO::STATUS_PUBLISHED;
        }
        return $errors;
    }
    /**
     * @param \RadCms\ContentType\ContentTypeDef $contentType
     * @param \stdClass $input
     * @return string[]
     */
    public static function validateUpdateData(ContentTypeDef $contentType,
                                              \stdClass $input): array {
        return self::validateInsertData($contentType, $input, function ($v) {
            $v->rule('isRevision', 'type', 'bool');
        });
    }
}
