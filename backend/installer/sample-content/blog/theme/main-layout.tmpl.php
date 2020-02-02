<?php
// Lokaalit tässä tiedostossa: {
//     $url: string,
//     $site: {$name: string, $lang: string},
// }.
// Lue lisää: https://todo/sivutemplaattien-käyttö. ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Hello - <?= $site->name ?></title>
    <meta name="generator" content="RadCMS <?= RAD_VERSION ?>">
    <?= $this->cssFiles() ?>
</head>
<body>
    <header>
        <h1>Hello</h1>
    </header>
    <div id="main">
        <?= $this->Articles() ?>
    </div>
    <?= $this->Footer() ?>
</body>
</html>