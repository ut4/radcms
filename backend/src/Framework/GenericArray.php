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
     * @param array ...$args Params to $this->T
     */
    public function add(...$args) {
        array_push($this->vals, new $this->T(...$args));
    }
    /**
     * @param \RadCms\Framework\GenericArray $other
     */
    public function merge(GenericArray $other) {
        $this->vals = array_merge($this->vals, $other->toArray());
    }
    /**
     * @param string $key
     * @param string $val
     * @return object|null
     */
    public function find($key, $val) {
        foreach ($this->vals as $t) {
            if ($t->$key === $val) return $t;
        }
        return null;
    }
    /**
     * @return array Array<$this->T>
     */
    public function toArray() {
        return $this->vals;
    }
}
