<?php

namespace RadCms\ContentType;

abstract class ContentTypeValidator {
    const MAX_NAME_LEN = 64;
    /**
     * @param \RadCms\ContentType\ContentTypeDef $contentType
     * @return array Array<string>
     */
    public static function validate(ContentTypeDef $contentType) {
        $errors = self::validateName($contentType->name);
        //
        if (!count($contentType->fields)) {
            array_push($errors, 'ContentType.fields must contain at least one field');
            return $errors;
        }
        foreach ($contentType->fields as $name => $dataType) {
            if (!is_string($name) || !preg_match('/^[a-zA-Z_]+$/', $name))
                array_push($errors, "`{$name}` must contain only [a-zA-Z_]");
            if (!is_string($dataType) ||
                !in_array($dataType, ContentTypeMigrator::FIELD_DATA_TYPES))
                array_push($errors, "`{$dataType}` is not valid data type");
        }
        return $errors;
    }
    /**
     * @param string $contentTypeName
     * @return array Array<string>
     */
    public static function validateName($contentTypeName) {
        $errors = [];
        if (!ctype_alpha($contentTypeName) ||
            !ctype_upper(mb_substr($contentTypeName, 0, 1)))
            array_push($errors, 'ContentType.name must be capitalized and contain only [a-ZA-Z]');
        if (mb_strlen($contentTypeName) > self::MAX_NAME_LEN)
            array_push($errors, 'ContentType.name must be <= 64 chars long');
        return $errors;
    }
}
