<?php

declare(strict_types=1);

namespace RadCms;

use Pike\PikeException;

abstract class ValidationUtils {
    /**
     * Heittää poikkeuksen mikäli $path sisältää './' tai '../'.
     *
     * @param string $path
     */
    public static function checkIfValidaPathOrThrow(string $path): void {
        if (strpos($path, './') !== false)
            throw new PikeException("`{$path}` is not valid path",
                                    PikeException::BAD_INPUT);
    }
}
