<?php

namespace RadCms\Templating;

class Template {
    use DefaultFunctions;
    //
    private $vars;
    private $__file;
    private $__ctx;
    private $__aliases;
    /**
     * @param string $file
     * @param mixed &$ctx = null
     * @param array $vars = null
     */
    public function __construct($file, $ctx = null, array $vars = null) {
        $this->vars = $vars;
        $this->__file = $file;
        $this->__ctx = $ctx;
        $this->__aliases = [];
    }
    /**
     * @param array $locals
     * @return string
     */
    public function render(array $locals) {
        return $this->doRender($this->__file, $locals);
    }
    /**
     * Renderöi templaatin `${RAD_SITE_PATH}${$this->aliases[$name] || $name}.tmpl.php`.
     * Esim. kutsu $this->Foo() renderöi templaatin "/foo/Foo.tmpl.php" (jos
     * RAD_SITE_PATH on "/foo/"), ja "c:/baz/dir/my-foo.tmpl.php" (jos
     * RAD_SITE_PATH on "c:/baz/", ja $this->aliases['Foo'] on "dir/my-foo").
     *
     * @param string $name
     * @param array $args
     * @return string
     */
    public function __call($name, $args) {
        if (isset($this->__aliases[$name]))
            $name = $this->__aliases[$name];
        return $this->doRender(RAD_SITE_PATH . $name . '.tmpl.php',
                               ['props' => $args ? $args[0] : new \stdClass()]);
    }
    /**
     * @param string $name
     * @return mixed
     */
    public function __get($name) {
        return $this->vars[$name];
    }
    /**
     * @return string
     */
    private function doRender($__file, $__locals) {
        ob_start();
        extract($__locals);
        include $__file;
        return ob_get_clean();
    }
}
