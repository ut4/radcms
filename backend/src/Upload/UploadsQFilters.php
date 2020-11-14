<?php

declare(strict_types=1);

namespace RadCms\Upload;

use Pike\PikeException;

final class UploadsQFilters {
    /** @var ?array<int, string> */
    private $byMimeFilterVals;
    /** @var ?array<int, string> */
    private $byNameContainingFilterVals;
    /** @var ?array<int, string> */
    private $byNameAndBasePathFilterVals;
    /**
     * @param string $mime 'image/*'
     * @return \RadCms\Upload\UploadsQFilters
     */
    public static function byMime(string $mime): UploadsQFilters {
        $out = new self();
        if ($mime === 'image/*')
            $out->byMimeFilterVals = ['image/%'];
        return $out;
    }
    /**
     * @param string $name
     * @param string $mime 'image/*'
     * @return \RadCms\Upload\UploadsQFilters
     */
    public static function byNameContaining(string $name, ?string $mime): UploadsQFilters {
        $out = !$mime ? new self() : self::byMime($mime);
        $out->byNameContainingFilterVals = ["%{$name}%"];
        return $out;
    }
    /**
     * @param string $name
     * @param string $basePath
     * @return \RadCms\Upload\UploadsQFilters
     */
    public static function byNameAndBasePath(string $name, string $basePath): UploadsQFilters {
        $out = new self();
        $out->byNameAndBasePathFilterVals = [$name, $basePath];
        return $out;
    }
    /**
     * @return array{0: string, 1: string[]}
     */
    public function toQParts(): array {
        if ($this->byNameContainingFilterVals) {
            return !$this->byMimeFilterVals
                ? ['`fileName` LIKE ?', $this->byNameContainingFilterVals]
                : ['`fileName` LIKE ? AND `mime` LIKE ?',
                   array_merge($this->byNameContainingFilterVals, $this->byMimeFilterVals)];
        }
        if ($this->byMimeFilterVals)
            return ['`mime` LIKE ?', $this->byMimeFilterVals];
        if ($this->byNameAndBasePathFilterVals)
            return ['`fileName` = ? AND `basePath` = ?', $this->byNameAndBasePathFilterVals];
        throw new PikeException('No filters set',
                                PikeException::BAD_INPUT);
    }
}
