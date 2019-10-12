<?php

namespace RadCms\Content;

abstract class ContentTypeValidator {
    const MAX_NAME_LEN = 64;
    /**
     * @param \RadCms\Content\ContentTypeDef $contentType
     * @return array Array<string>
     */
    public static function validate(ContentTypeDef $contentType) {
        $errors = [];
        if (!ctype_alpha($contentType->name) ||
            !ctype_upper(mb_substr($contentType->name, 0, 1)))
            array_push($errors, 'ContentType.name must be capitalized and contain only [a-ZA-Z]');
        if (mb_strlen($contentType->name) > self::MAX_NAME_LEN)
            array_push($errors, 'ContentType.name must be <= 64 chars long');
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
}
