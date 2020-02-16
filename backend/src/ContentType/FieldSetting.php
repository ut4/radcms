<?php

namespace RadCms\ContentType;

/**
 * Parsii ja serialisoi site.json-tiedostossa käytettäviä merkkijonoja, esim:
 * 'int(11)' tulee {name: 'int', args: {v0: '11'}} ja 'color(initial=#000000)' tulee
 * {name: color, args: {initial: '#000000'}}.
 */
class FieldSetting {
    public $name;
    public $args;
    /**
     * @param string $name
     */
    public function __construct($name) {
        $this->name = $name;
        $this->args = new \stdClass();
    }
    /**
     * @param string $str 'text', 'int(11)', 'color(initial=#000000)'
     */
    public function toCompactForm() {
        if (empty((array)$this->args))
            return $this->name;
        $pairs = [];
        foreach ($this->args as $name => $val)
            $pairs[] = !ctype_digit($name)
                ? "{$name}={$val}"
                : $val;
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
    public static function fromCompactForm($compactSetting) {
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