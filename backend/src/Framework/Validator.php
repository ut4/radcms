<?php

namespace RadCms\Framework;

/**
 * Simppeli data-validaattori. Esimerkki:
 * ```php
 * $v = new Validator((object)['foo' => 'bar']);
 * $myRule = [function($input,$key){return false;}, '%s is always nope'];
 * echo $v->check('foo', 'present') ? 'pass' : 'nope';
 * echo $v->check('foo', ['in', ['a', 'b']]) ? 'pass' : 'nope';
 * echo $v->check('foo', $myRule, 'anotherbuiltin', ['mixed', [123]]) ? 'pass' : 'nope';
 * echo json_encode($v->errors);
 * ```
 */
class Validator {
    public $errors;
    public $input;
    /**
     * @param object &$input
     */
    public function __construct(&$input) {
        $this->errors = [];
        $this->input = $input;
    }
    /**
     * @param string $key
     * @param array ...$rules Array<string | [function, string] | [string, array]>
     * @return bool
     */
    public function is($key, ...$rules) {
        array_push($rules, false);
        return $this->check($key, ...$rules);
    }
    /**
     * Ajaa kaikki £rules:t passaten niille $this->input->$key:n arvon. Pysähtyy
     * ensimmäiseen positiveen ja palauttaa false, muutoin true.
     *
     * @param string $key
     * @param array ...$rules ks. is()
     * @return bool
     */
    public function check($key, ...$rules) {
        $doLog = $rules[count($rules) - 1] !== false;
        foreach ($rules as $rule) {
            if (is_string($rule)) {
                $rule = $this->$rule();
            } else if (is_array($rule) && is_string($rule[0])) {
                [$rname, $args] = $rule;
                $rule = $this->$rname($args);
            } else if (is_bool($rule)) {
                break;
            }
            if (!$rule[0]($this->input, $key)) {
                if ($doLog) array_push($this->errors, sprintf($rule[1], $key));
                return false;
            }
        }
        return true;
    }
    /**
     * Palauttaa uuden present-rulen.
     *
     * @return bool
     */
    public function present() {
        return [function ($input, $key) {
            return isset($input->$key) && is_string($input->$key) && $input->$key;
        }, '%s !present'];
    }
    /**
     * Palauttaa uuden in-rulen.
     *
     * @param array $arr
     * @return bool
     */
    public function in($arr) {
        return [function ($input, $key) use ($arr) {
            return $this->is($key, 'present') && in_array($input->$key, $arr);
        }, '%s !in'];
    }
}
