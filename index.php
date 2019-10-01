<?php
namespace RadCms;

class LayoutLookup {
    public function findLayoutFor($url) {
        return [
            '/' => 'main-layout.tmp.php',
            '/art1' => 'article-layout.tmp.php',
            '/art2' => 'article-layout.tmp.php',
        ][$url];
    }
}
class Template {
    public function __construct($php) {
        $this->php = $php;
    }
    public function render($locals) {
        ob_start();
        \RadCms\Template::betterEval($this->php, $locals);
        $rendered = ob_get_contents();
        ob_end_clean();
        return $rendered;
    }
    // https://www.php.net/manual/en/function.eval.php#121190
    private static function betterEval($__code, $__locals) {
        extract($__locals);
        $__tmp = tmpfile();
        $__tmpf = stream_get_meta_data($__tmp)['uri'];
        fwrite($__tmp, $__code);
        include($__tmpf);
        fclose($__tmp);
    }
}
class Templating {
    public function render($fileName, $locals, $mod=null) {
        $php = file_get_contents($fileName);
        if ($mod) $php = $mod($php);
        return (new \RadCms\Template($php))->render($locals);
    }
}
class DDC {
    public $batches; // @todo
    private $batchCount;
    public function __construct() {
        $this->batches = [];
        $this->batchCount = 0;
    }
    /**
     * @param string $contentTypeName eg. 'Article', 'Product', 'Movie', 'Employee'
     * @return \RadCms\DBC
     */
    public function fetchAll($contentTypeName) {
        $len = array_push($this->batches, new \RadCms\DBC($contentTypeName, true,
                                                          ++$this->batchCount, $this));
        return $this->batches[$len - 1];
    }
    /**
     * @param string $contentTypeName
     * @return \RadCms\DBC
     */
    public function fetchOne($contentTypeName) {
        $len = array_push($this->batches, new \RadCms\DBC($contentTypeName, false,
                                                          ++$this->batchCount, $this));
        return $this->batches[$len - 1];
    }
}
class DBC {
    private $contentTypeName;
    private $isFetchAll;
    private $id;
    private $ddc;
    private $whereExpr;
    private $orderByExpr;
    private $limitExpr;
    public function __construct($contentTypeName, $isFetchAll, $id, $ddc) {
        $this->contentTypeName = $contentTypeName;
        $this->isFetchAll = $isFetchAll;
        $this->id = $id;
        $this->ddc = $ddc;
        $this->whereExpr = null;
        $this->orderByExpr = null;
        $this->limitExpr = null;
    }
    public function where($expr) {
        $this->whereExpr = $expr;
        return $this;
    }
    public function exec() {
        $footer = (object) ['content' => 'Hello'];
        $art1 = (object) ['title' => 'Art1', 'body' => '...1', 'defaults' => (object)['name' => 'art1']];
        $art2 = (object) ['title' => 'Art2', 'body' => '...2', 'defaults' => (object)['name' => 'art2']];
        if ($this->ddc->batches[0]->isFetchAll) // main-layout
            return [
                [
                    $art1,
                    $art2,
                ],
                $footer
            ];
        // article-layout
        return [$this->ddc->batches[0]->whereExpr == 'name=\'art1\'' ? $art1 : $art2, $footer];
    }
    public function fetchOne($contentTypeName) {
        return $this->ddc->fetchOne($contentTypeName);
    }
    public function fetchAll($contentTypeName) {
        return $this->ddc->fetchAll($contentTypeName);
    }
}
class Router {
    private $matchers = [];
    public function addMatcher($fn) {
        array_push($this->matchers, $fn);
    }
    public function dispatch(\RadCms\Request $req) {
        $handler = null;
        foreach ($this->matchers as $matcher) {
            $handler = $matcher($req->path, $req->method);
            if ($handler) break;
        }
        if ($handler) {
            $res = new \RadCms\Response();
            call_user_func($handler, $req, $res);
        }
        else throw new \RuntimeException("No route for {$req->path}"); 
    }
}
class Request {
    public $path;
    public $method;
    public $user;
    public function __construct() {
        // /mybase/foo -> /foo
        $this->path = str_replace(RAD_BASE_URL, '', $_SERVER['REQUEST_URI']);
        $this->method = $_SERVER['REQUEST_METHOD'];
    }
}
class Response {
    public $contentType;
    public function __construct($contentType = 'html') {
        $this->type($contentType);
    }
    public function type($type) {
        $this->contentType = [
            'html' => 'text/html',
            'json' => 'application/json',
        ][$type];
        return $this;
    }
    /**
     * @param {string|object} $body = ''
     */
    public function send($body = '') {
        header('Content-Type: ' .  $this->contentType);
        echo is_string($body) ? $body : json_encode($body);
    }
}
abstract class DefaultDirectives {
    public static function registerAll(&$tmplVars) {
        $tmplVars['ArticleList'] = function($arts) use ($tmplVars) {
            return (new \RadCms\Templating())->render('ArticleList.tmp.php',
                array_merge($tmplVars, ['articles' => $arts])
            );
        };
    }
}


abstract class WebsiteModule {
    public static function init($services) {
        $makeCtrl = function () {
            return new \RadCms\WebsiteControllers(new \RadCms\LayoutLookup(), new \RadCms\Templating());
        };
        $services->router->addMatcher(function ($url, $method) use ($makeCtrl) {
            if ($method == 'GET') return [$makeCtrl(), 'handlePageRequest'];
        });
    }
}
class WebsiteControllers {
    private $layoutLookup;
    private $templating;
    public function __construct(\RadCms\LayoutLookup $layoutLookup,
                                \RadCms\Templating $templating) {
        $this->layoutLookup = $layoutLookup;
        $this->templating = $templating;
    }
    public function handlePageRequest(\RadCms\Request $req, \RadCms\Response $res) {
        $layout = $this->layoutLookup->findLayoutFor($req->path);
        if (!$layout) {
            return $res->send('404');
        }
        $ddc = new DDC();
        $tmplVars = [];
        $tmplVars['fetchAll'] = function($contentTypeName) use ($ddc) {
            return $ddc->fetchAll($contentTypeName);
        };
        $tmplVars['fetchOne'] = function($contentTypeName) use ($ddc) {
            return $ddc->fetchOne($contentTypeName);
        };
        $tmplVars['url'] = explode('/', ltrim($req->path, '/'));
        $tmplVars['makeUrl'] = function($path) {
            return '/rad' . $path;
        };
        \RadCms\DefaultDirectives::registerAll($tmplVars);
        $res->send($this->templating->render($layout, $tmplVars,
            $req->user
                ? function ($html) {
                    $bodyEnd = strpos($html, '</body>');
                    $dataToFrontend = [
                        "directiveElems"=>[],
                        "allContentNodes"=>[
                            ["title"=>"Art","body"=>"Hello","defaults"=>["id"=>1,"name"=>"art1","dataBatchConfigId"=>1]],
                            ["content"=>"(c) 2034 MySitea","defaults"=>["id"=>1,"name"=>"footer","dataBatchConfigId"=>2]]
                        ],
                        "page"=>["url"=>"/home","layoutFileName"=>"main-layout.jsx.htm"],
                        "sitePath"=>"C:/cpp3/shelf/s2/"];
                    if ($bodyEnd !== false) {
                        return substr($html, 0, $bodyEnd) . '<iframe src="frontend/cpanel.html" id="insn-cpanel-iframe" style="position:fixed;border:none;height:100%;width:275px;right:0;top:0"></iframe><script>function setIframeVisible(setVisible){document.getElementById(\'insn-cpanel-iframe\').style.width=setVisible?\'100%\':\'275px\';}function getCurrentPageData(){return ' . json_encode($dataToFrontend) . ';}</script>' . substr($html, $bodyEnd);
                    }
                    return $html;
                }
                : null
        ));
    }
}
abstract class ContentModule {
    public static function init($services) {
        $makeCtrl = function () {
            return new \RadCms\ContentControllers();
        };
        $services->router->addMatcher(function ($url, $method) use ($makeCtrl) {
            if (strpos($url, '/api/content/') === 0) return [$makeCtrl(), 'handleGetContentNode'];
            if (strpos($url, '/api/content-types/') === 0) return [$makeCtrl(), 'handleGetContentType'];
        });
    }
}
class ContentControllers {
    public function __construct() {
        //
    }
    public function handleGetContentNode(\RadCms\Request $req, \RadCms\Response $res) {
        return $res->type('json')->send([
            'id' => 1, 
            'name' => 'footer',
            'json' => json_encode(['content' => '(c) 2034 MySitea']),
            'contentTypeId' => 1
        ]);
    }
    public function handleGetContentType(\RadCms\Request $req, \RadCms\Response $res) {
        return $res->type('json')->send([
            'id' => 1, 
            'name' => 'Generic blobs',
            'fields' => ['content' => 'richtext']
        ]);
    }
}
abstract class AuthModule {
    public static function init($services) {
        $makeCtrl = function () {
            return new \RadCms\AuthControllers();
        };
        $services->router->addMatcher(function ($url, $method) use ($makeCtrl) {
            if (strpos($url, '/login') === 0) return [$makeCtrl(), 'renderLoginView'];
        });
    }
}
class AuthControllers {
    public function __construct() {
        //
    }
    public function renderLoginView(\RadCms\Request $_, \RadCms\Response $res) {
        $res->send('<label>Käyttäjänimi<input></label>');
    }
}

define('RAD_BASE_URL', '/rad');

$services = (object) ['router' => new Router()];
\RadCms\ContentModule::init($services);
\RadCms\AuthModule::init($services);
\RadCms\WebsiteModule::init($services);

$request = new \RadCms\Request();
$request->user = (object) ['id' => 1];
$services->router->dispatch($request);
