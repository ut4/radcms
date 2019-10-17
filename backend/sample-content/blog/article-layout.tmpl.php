<?php
$article = null;
$rendered = $this->Article(['slug' => $url[0], 'bindTo' => &$article]); ?>
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