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
        $rules[] = false;
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
            } elseif (is_array($rule) && is_string($rule[0])) {
                [$rname, $args] = $rule;
                $rule = $this->$rname($args);
            } elseif (is_bool($rule)) {
                break;
            }
            if (!$rule[0]($this->input, $key)) {
                if ($doLog) $this->errors[] = sprintf($rule[1], $key);
                return false;
            }
        }
        return true;
    }
    /**
     * @return array [($input: string, $key: string): bool, string]
     */
    public function present() {
        return [function ($input, $key) {
            return isset($input->$key) && is_string($input->$key) && $input->$key;
        }, '%s !present'];
    }
    /**
     * @param array $arr
     * @return array [($input: string, $key: string): bool, string]
     */
    public function in($arr) {
        return [function ($input, $key) use ($arr) {
            return $this->is($key, 'present') && in_array($input->$key, $arr);
        }, '%s !in'];
    }
    /**
     * @return array [($input: string, $key: string): bool, string]
     */
    public function word() {
        return [function ($input, $key) {
            return $this->is($key, 'present') &&
                   ctype_alnum(str_replace(['_', '-'], '', $input->$key));
        }, '%s !word'];
    }
}
