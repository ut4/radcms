<?php

$thisFilePath = str_replace('\\', '/', __DIR__ . '/');

if ($_SERVER['REQUEST_METHOD'] != 'POST') { ?>
<!DOCTYPE html>
<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <title>RadCMS - Asennusvelho</title>
        <link rel="stylesheet" href="frontend/common.css">
        <link rel="stylesheet" href="frontend/install-app/install-app.css">
    </head>
    <body class="light">
        <div id="install-app"></div>
        <script src="frontend/vendor/vendor.bundle.min.js"></script>
        <script type="module">
            import {InstallApp} from './frontend/install-app/src/install-app.js';
            preact.render(preact.createElement(InstallApp, {sitePath: '<?= $thisFilePath ?>'}),
                          document.getElementById('install-app'));
        </script>
    </body>
</html>
<?php } else {
    list($statusCode, $responseBody) = Installer::handleRequest($thisFilePath);
    header('Content-Type: application/json');
    http_response_code($statusCode);
    echo $responseBody;
}

////////////////////////////////////////////////////////////////////////////////

class Installer {
    /**
     * @param string $sitePath Absoluuttinen polku kansioon, johon sivusto halutaan asentaa
     * @param string $requestContentType = null
     * @param callable $fileGetContentsFn = 'file_get_contents'
     * @param callable $fileExistsFn = 'file_exists'
     * @param \RadCMS\Common\FileSystemInterface $fs = null
     * @return array [statusCode, message]
     */
    public static function handleRequest($sitePath,
                                         $requestContentType = null,
                                         $fileGetContentsFn = 'file_get_contents',
                                         $fileExistsFn = 'file_exists',
                                         $fs = null) {
        if (($requestContentType ?: $_SERVER['CONTENT_TYPE']) !== 'application/json') {
            return [400, 'expected content-type "application/json"'];
        }
        if (!($input = json_decode($fileGetContentsFn('php://input'), true))) {
            return [400, 'invalid json input'];
        }
        // todo check if index.php already exists
        if (($errors = validateAndSanitizeInput($input, $sitePath,
                                                $fileExistsFn)) !== '') {
            return [400, $errors];
        }
        include $input['radPath'] . 'src/Common/Db.php';
        include $input['radPath'] . 'src/Common/FileSystemInterface.php';
        include $input['radPath'] . 'src/Common/FileSystem.php';
        $installer = new Installer($fs ?: new \RadCms\Common\FileSystem(),
                                   $sitePath);
        $message = $installer->doInstall($input);
        return [$message == 'ok' ? 200 : 500, $message];
    }

    ////////////////////////////////////////////////////////////////////////////

    private $db;
    private $fs;
    private $sitePath;
    /**
     * @param \RadCMS\Common\FileSystemInterface $fs
     * @param string $sitePath
     */
    public function __construct(\RadCMS\Common\FileSystemInterface $fs,
                                $sitePath) {
        $this->db = null;
        $this->fs = $fs;
        $this->sitePath = $sitePath;
    }
    /**
     * @param array $data
     */
    public function doInstall($data) {
        $sampleContent = null;
        try {
            $this->openDbConnAndCreateDbSchema($data);
            $sampleContent = $this->insertSampleContentToDb($data);
            if (!$sampleContent) return 'Failed to insert sample content.';
        } catch (PDOException $_) {
            return 'A database error occured.';
        }
        foreach ($sampleContent['files'] as $fileName => $contents) {
            if (!$this->fs->write($this->sitePath . $fileName, $contents)) {
                return 'Failed to write "' . $this->sitePath . $fileName . '"';
            }
        }
        if (!$this->generateConfigFile($data)) {
            return 'Failed to generate "' . $this->sitePath . 'config.php' . '"';
        }
        // todo self-destruct
        //if (!@unlink(__FILE__)) { log(<warning>); }
        //
        return 'ok';
    }
    /**
     * .
     */
    private function openDbConnAndCreateDbSchema($data) {
        $this->db = new \RadCms\Common\Db([
            'db.host'        => $data['dbHost'],
            'db.database'    => null,
            'db.user'        => $data['dbUser'],
            'db.pass'        => $data['dbPass'],
            'db.tablePrefix' => $data['dbTablePrefix'],
            'db.charset'     => $data['dbCharset'],
        ]);
        $this->db->attr(\PDO::ATTR_EMULATE_PREPARES, 1);
        //
        $this->db->exec('CREATE DATABASE IF NOT EXISTS ' . $data['dbDatabase']);
        //
        $sql = $this->fs->read($data['radPath'] . 'schema.mariadb.sql');
        $sql = str_replace('${database}', $data['dbDatabase'], $sql);
        $this->db->exec($sql);
        return true;
    }
    /**
     * .
     */
    private function insertSampleContentToDb($data) {
        $sql = $this->fs->read($data['radPath'] . 'sample-content/data-' .
                               $data['sampleContent'] . '.sql');
        if (!$sql) return false;
        $sql = str_replace('${database}', $data['dbDatabase'], $sql);
        $sql = str_replace('${siteName}', $data['siteName'], $sql);
        $sampleContent = getSampleContent($data['sampleContent']);
        foreach ($sampleContent['contentTypes'] as $contentType) {
            $sql = str_replace('${' . $contentType['name'] . '.name}',
                               $contentType['name'], $sql);
            $sql = str_replace('${' . $contentType['name'] . '.fields}',
                               json_encode($contentType['fields']), $sql);
        }
        return $this->db->exec($sql) > 0 ? $sampleContent : null;
    }
    /**
     * .
     */
    private function generateConfigFile($data) {
        return $this->fs->write(
            $this->sitePath . 'config.php',
"<?php
define('RAD_BASE_URL', '{$data['baseUrl']}');
define('RAD_BASE_PATH', '{$data['radPath']}');
define('RAD_SITE_PATH', '{$this->sitePath}');
\$config = [
    'db.host'        => '{$data['dbHost']}',
    'db.database'    => '{$data['dbDatabase']}',
    'db.user'        => '{$data['dbUser']}',
    'db.pass'        => '{$data['dbPass']}',
    'db.tablePrefix' => '{$data['dbTablePrefix']}',
    'db.charset'     => '{$data['dbCharset']}',
];
"
        );
    }
}

////////////////////////////////////////////////////////////////////////////////

function validateAndSanitizeInput(&$input, $sitePath, $fileExistsFn,
                                  $installKeyPath = '') {
    $errors = [];
    $isEmpty = function ($key) use ($input) { return !isset($input[$key]) || !$input[$key]; };
    //
    if (!validateInstallKey($input, $installKeyPath))
        array_push($errors, 'installKey is not valid');
    if ($isEmpty('dbHost')) array_push($errors, 'dbHost required');
    if ($isEmpty('dbDatabase')) array_push($errors, 'dbDatabase required');
    if ($isEmpty('dbUser')) array_push($errors, 'dbUser required');
    if ($isEmpty('dbPass')) array_push($errors, 'dbPass required');
    if ($isEmpty('dbTablePrefix')) array_push($errors, 'dbTablePrefix required');
    if ($isEmpty('dbCharset')) $input['dbCharset'] = 'utf8';
    else if (!in_array($input['dbCharset'], ['utf8']))
        array_push($errors, 'Invalid dbCharset');
    //
    if ($isEmpty('siteName')) $input['siteName'] = 'My Site';
    if ($isEmpty('baseUrl')) array_push($errors, 'baseUrl required');
    else rtrim($input['baseUrl'], '/') . '/';
    if ($isEmpty('radPath')) $input['radPath'] = dirname($sitePath) . '/backend/';
    else {
        $input['radPath'] = rtrim($input['radPath'], '/') . '/';
        if (!$fileExistsFn($input['radPath'] . 'src/Common/Db.php'))
            array_push($errors, 'radPath "' . $input['radPath'] . '" not valid');
    }
    if ($isEmpty('sampleContent')) $input['sampleContent'] = 'blog';
    else if (!in_array($input['sampleContent'], ['minimal', 'blog']))
        array_push($errors, 'Invalid sampleContent name "' .
                            $input['sampleContent'] . '"');
    //
    return $errors ? implode('\n', $errors) : '';
}

function validateInstallKey($input, $installKeyPath) {
    return true;
    // todo
    $keyFileContents = file_get_contents($installKeyPath);
    if (!$keyFileContents) return false;
    $keyStart = strpos($keyFileContents, '// key:');
    if ($keyStart === false) return false;
    $key = substr($keyFileContents, $keyStart, 4);
    return $key && isset($input['installKey']) && $input['installKey'] !== $key;
}

function getSampleContent($name) {
    $genericContentType = ['name' => 'Generic blobs',
                           'friendlyName' => 'Geneerinen',
                           'fields' => ['content' => 'richtext']];
    $articleContentType = ['name' => 'Articles',
                           'friendlyName' => 'Artikkeli',
                           'fields' => ['title' => 'text', 'body' => 'richtext']];
    return [
        'minimal' => [
            'contentTypes' => [$genericContentType],
            'files' => [
                'main-layout.tmpl.php' => <<<'EOT'
<!DOCTYPE html>
<html lang="en">
<head>
    <title>Hello</title>
    <meta name="generator" content="RadCMS 0.0.0">
</head>
<body>
    <header>
        <h1>Hello</h1>
    </header>
    <div id="main">
        <?= $this->Generic(['name' => 'home-content',
                            'frontendPanelTitle' => 'Home content']) ?>
    </div>
    <footer>
        &copy; MySite <?= date('Y') ?>
    </footer>
</body>
</html>
EOT
,
                'Generic.tmpl.php' => <<<'EOT'
<?php
use RadCms\Templating\FrontendPanelType;
$node = $this->fetchOne('Generic blobs')
                ->where("name='{$props['name']}'")
                ->createFrontendPanel(FrontendPanelType::Generic, $props['frontendPanelTitle'])
                ->exec();
echo $node ? $node->content : 'No content found.'; ?>
EOT
            ]
        ],
        'blog' => [
            'contentTypes' => [$genericContentType, $articleContentType],
            'files' => [
                'main-layout.tmpl.php' => <<<'EOT'
<!DOCTYPE html>
<html lang="en">
<head>
    <title>Hello</title>
    <meta name="generator" content="RadCMS 0.0.0">
</head>
<body>
    <header>
        <h1>Hello</h1>
    </header>
    <div id="main">
        <?= $this->Articles(['frontendPanelTitle' => 'Homepage articles']) ?>
    </div>
    <footer>
        &copy; MySite <?= date('Y') ?>
    </footer>
</body>
</html>
EOT
,
                'Articles.tmpl.php' => <<<'EOT'
<?php
use RadCms\Templating\FrontendPanelType;
$articles = $this->fetchAll('Articles')
                 ->createFrontendPanel(FrontendPanelType::List, $props['frontendPanelTitle'])
                 ->exec();
//
foreach ($articles as $art): ?>
    <article>
        <h2><?= $art->title ?></h2>
        <div>
            <p><?= substr($art->body, 0, 6) . '... ' ?></p>
            <a href="<?= $this->url($art->defaults->name) ?>">Read more</a>
        </div>
    </article>
<?php endforeach; ?>
EOT
,
                'article-layout.tmpl.php' => <<<'EOT'
<?php
$article = null;
$rendered = $this->Article(['name' => $url[0], 'bindTo' => &$article]); ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <title><?= $article->title ?></title>
    <meta name="generator" content="RadCMS 0.0.0">
</head>
<body>
    <header>
        <h1>My site</h1>
    </header>
    <div id="main">
        <a href="<?= $this->url('/') ?>">Back</a>
        <?= $rendered ?>
    </div>
    <footer>
        &copy; MySite <?= date('Y') ?>
    </footer>
</body>
</html>
EOT
,
                    'Article.tmpl.php' => <<<'EOT'
<?php
use RadCms\Templating\FrontendPanelType;
$article = $this->fetchOne('Articles')
                ->where("name='{$props['name']}'")
                ->createFrontendPanel(FrontendPanelType::Generic, 'Article')
                ->exec();
if (array_key_exists('bindTo', $props))
    $props['bindTo'] = $article; ?>
<article>
    <h2><?= $article->title ?></h2>
    <div><?= $article->body ?></div>
</article>
EOT
,
                ]
        ],
    ][$name];
}
