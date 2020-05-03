<?php

declare(strict_types=1);

namespace RadCms\ContentType;

/**
 * Parsii ja serialisoi kompaktoituja merkkijonoja, esim: 'int(11)' tulee
 * {name: 'int', args: {v0: '11'}} ja 'color(initial=#000000)' tulee
 * {name: color, args: {initial: '#000000'}}.
 */
class FieldSetting {
    public $name;
    public $args;
    /**
     * @param string $name
     * @param \stdClass $args = null
     */
    public function __construct(string $name, \stdClass $args = null) {
        $this->name = $name;
        $this->args = $args ?? new \stdClass;
    }
    /**
     * @param string $str 'text', 'int(11)', 'color(initial=#000000)'
     */
    public function toCompactForm(): string {
        if (empty((array)$this->args))
            return $this->name;
        $pairs = [];
        foreach ($this->args as $name => $val)
            $pairs[] = !ctype_digit($name) ? "{$name}={$val}" : $val;
        return $this->name . '(' . implode(',', $pairs) . ')';
    }

    ////////////////////////////////////////////////////////////////////////////

    /**
     * 'int'          -> {name: 'int', args: {}}
     * 'int (11)'     -> {name: 'int', args: {v0: '11'}}
     * 'foo(a=a,b=b)' -> {name: 'foo', args: {a: 'a', b: 'b'}}
     *
     * @param string $compactSetting
     * @return \RadCms\ContentType\FieldSetting
     */
    public static function fromCompactForm(string $compactSetting): FieldSetting {
        $pcs = explode('(', trim($compactSetting));
        $out = new static(rtrim($pcs[0]));
        if (count($pcs) > 1) {
            $args = array_map('trim', explode(',', mb_substr($pcs[1], 0, mb_strlen($pcs[1]) - 1)));
            $i = 0;
            foreach ($args as $arg) {
                $pair = array_map('trim', explode('=', $arg));
                if (count($pair) > 1) {
                    $out->args->{$pair[0]} = $pair[1];
                } else {
                    $out->args->{'v' . $i} = $pair[0];
                    $i += 1;
                }
            }
        }
        return $out;
    }
}
