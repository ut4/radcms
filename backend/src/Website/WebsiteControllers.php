<?php

namespace RadCms\Website;

use RadCms\LayoutLookup;
use RadCms\Templating;
use RadCms\Request;
use RadCms\Response;
use RadCms\DDC;
use RadCms\DefaultDirectives;

class WebsiteControllers {
    private $layoutLookup;
    private $templating;
    /**
     * Handlaa sivupyynnöt, (GET '/' tai GET '/sivunnimi').
     *
     * @param LayoutLookup $layoutLookup
     * @param Templating $templating
     */
    public function __construct(LayoutLookup $layoutLookup,
                                Templating $templating) {
        $this->layoutLookup = $layoutLookup;
        $this->templating = $templating;
    }
    /**
     * GET *: handlaa sivupyynnön.
     *
     * @param Request $request
     * @param Response $response
     */
    public function handlePageRequest(Request $req, Response $res) {
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
        DefaultDirectives::registerAll($tmplVars);
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
