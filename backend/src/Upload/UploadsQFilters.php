<?php

declare(strict_types=1);

namespace RadCms\Upload;

use Pike\PikeException;

final class UploadsQFilters {
    /** @var string[] */
    private $byMimeFilterVals;
    /**
     * @param string $mime 'image/*'
     * @return \RadCms\Upload\UploadsQFilters
     */
    public static function byMime(string $mime): UploadsQFilters {
        $out = new self();
        if ($mime !== 'image/*')
            throw new PikeException('Mimes othe than `image/*` not supported',
                                    PikeException::BAD_INPUT);
        $out->byMimeFilterVals = ['image/%'];
        return $out;
    }
    /**
     * @return array{0: string, 1: string[]}
     */
    public function toQParts(): array {
        if ($this->byMimeFilterVals)
            return ['`mime` LIKE ?', $this->byMimeFilterVals];
        throw new PikeException('No filters set',
                                PikeException::BAD_INPUT);
    }
}
