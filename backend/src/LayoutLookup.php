<?php

namespace RadCms;

class LayoutLookup {
    private $rules;
    /**
     * @param array $rules = null [(object)['pattern' => '', 'layoutFileName' => ''],...]
     */
    public function __construct($rules = null) {
        $this->setRules($rules ?: [(object)['pattern' => '.*',
                                            'layoutFileName' => 'main-layout.tmpl.php']]);
    }
    /**
     * @param array $rules ks. __construct
     */
    public function setRules($rules) {
        $this->rules = array_map(function ($rule) {
            $rule->pattern = '/^' . str_replace('/', '\\/', $rule->pattern) . '$/i';
            return $rule;
        }, $rules);
    }
    /**
     * @param string $url
     * @return string
     */
    public function findLayoutFor($url) {
        foreach ($this->rules as $rule) {
            if (preg_match($rule->pattern, $url)) return $rule->layoutFileName;
        }
        return '';
    }
}
