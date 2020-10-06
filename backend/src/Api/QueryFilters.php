<?php

declare(strict_types=1);

namespace RadCms\Api;

use Pike\{PikeException, Validation};

final class QueryFilters {
    /** @var array<string, array<int, string|mixed[]>> */
    private $filters;
    /**
     * @return array<string, array<int, string|mixed[]>>
     */
    private function __construct(array $filters) {
        $this->filters = $filters;
    }
    /**
     * @return array<string, array<int, string|mixed[]>> ['<colNameOrKeyword>' => [<filterType>, <value>]...]
     */
    public function getFilters(): array {
        return $this->filters;
    }
    /**
     * @param string $filters
     * @return \RadCms\Api\QueryFilters
     * @throws \Pike\PikeException
     */
    public static function fromString(string $filters): QueryFilters {
        $input = json_decode($filters);
        if ($input === null) throw new PikeException('Failed to parse filters',
                                                     PikeException::BAD_INPUT);
        if (!is_object($input)) throw new PikeException('Filters must by an object',
                                                        PikeException::BAD_INPUT);
        $filters = [];
        foreach ($input as $colNameOrKeyword => $filter) {
            if ($colNameOrKeyword === '$limit') {
                $filters['$limit'] = [null, strval($filter)];
                continue;
            }
            if (!is_object($filter))
                throw new PikeException('Filter must by an object',
                                        PikeException::BAD_INPUT);
            if (!Validation::isIdentifier($colNameOrKeyword))
                throw new PikeException("Filter column name `{$colNameOrKeyword}` is not" .
                                        " valid identifier",
                                        PikeException::BAD_INPUT);
            $filterType = key($filter);
            if (in_array($filterType, ['$eq', '$in', '$startsWith', '$contains', '$gt'])) {
                if ($filterType === '$in' && !is_array($filter->{$filterType}))
                    throw new PikeException('$in value must be an array',
                                            PikeException::BAD_INPUT);
                $filters[$colNameOrKeyword] = [$filterType, $filter->{$filterType}];
            } else
                throw new PikeException("Unsupported filter type `{$filterType}`",
                                        PikeException::BAD_INPUT);
        }
        return new self($filters);
    }
    /**
     * @return array [<whereSql>, <whereVals>, <limitExpr>]
     */
    public function toQParts(): array {
        $whereSql = [];
        $whereVals = [];
        $limitExpr = null;
        foreach ($this->filters as $colNameOrKeyword => [$filterType, $value]) {
            if ($colNameOrKeyword === '$limit') {
                $limitExpr = $value;
            } elseif ($filterType === '$eq') {
                $whereSql[] = "`{$colNameOrKeyword}` = ?";
                $whereVals[] = $value;
            } elseif ($filterType === '$in' && $value) {
                $whereSql[] = "`{$colNameOrKeyword}` IN (".implode(',',array_fill(0,count($value),'?')).")";
                $whereVals = array_merge($whereVals, $value);
            } elseif ($filterType === '$startsWith') {
                $whereSql[] = "`{$colNameOrKeyword}` LIKE ?";
                $whereVals[] = "{$value}%";
            } elseif ($filterType === '$contains') {
                $whereSql[] = "`{$colNameOrKeyword}` LIKE ?";
                $whereVals[] = "%{$value}%";
            } elseif ($filterType === '$gt') {
                $whereSql[] = "`{$colNameOrKeyword}` > ?";
                $whereVals[] = $value;
            }
        }
        return [$whereSql, $whereVals, $limitExpr];
    }
    /**
     * @param string $columnOrKeyword
     * @return bool
     */
    public function hasFilter(string $columnOrKeyword): bool {
        return $this->getFilter($columnOrKeyword) !== null;
    }
    /**
     * @param string $columnOrKeyword
     * @return ?array<int, string|mixed[]> [<filterType>, <value>]|null
     */
    public function getFilter(string $columnOrKeyword): ?array {
        return $this->filters[$columnOrKeyword] ?? null;
    }
}
