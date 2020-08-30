<?php

declare(strict_types=1);

namespace RadCms;

use Pike\PikeException;

abstract class ValidationUtils {
    /**
     * Heittää poikkeuksen mikäli $path sisältää './', '../', tai '/' (strict).
     *
     * @param string $path
     * @param bool $strict = false
     */
    public static function checkIfValidaPathOrThrow(string $path,
                                                    bool $strict = false): void {
        if (strpos($path, $strict ? '/' : './') !== false)
            throw new PikeException("`{$path}` is not valid path",
                                    PikeException::BAD_INPUT);
    }
}
