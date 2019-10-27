<?php

namespace RadCms\Framework;

/**
 * Array<T>.
 */
class GenericArray {
    private $T;
    private $vals;
    /**
     * @param class $T
     */
    public function __construct($T) {
        $this->T = $T;
        $this->vals = [];
    }
    /**
     * @param mixed|T ...$firstArgOrT
     * @param array ...$args
     */
    public function add($firstArgOrT, ...$remainingArgs) {
        if (!is_a($firstArgOrT, $this->T))
            array_push($this->vals, new $this->T($firstArgOrT, ...$remainingArgs));
        else
            array_push($this->vals, $firstArgOrT);
    }
    /**
     * @param \RadCms\Framework\GenericArray $other
     */
    public function merge(GenericArray $other) {
        $this->vals = array_merge($this->vals, $other->toArray());
    }
    /**
     * @param string $val
     * @param string $key = 'name'
     * @return object|null
     */
    public function find($val, $key = 'name') {
        foreach ($this->vals as $t) {
            if ($t->$key === $val) return $t;
        }
        return null;
    }
    /**
     * @return int
     */
    public function length() {
        return count($this->vals);
    }
    /**
     * @return array Array<$this->T>
     */
    public function toArray() {
        return $this->vals;
    }
}
