<?php
// Lokaalit tässä tiedostossa: {
//     $url: string,
//     $site: {$name: string, $lang: string},
// }.
// Lue lisää: https://todo/sivutemplaattien-käyttö. ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <title>Hello - <?= $site->name ?></title>
    <meta name="generator" content="RadCMS 0.0.0">
</head>
<body>
    <header>
        <h1>Hello</h1>
    </header>
    <div id="main">
        <?= $this->Generic(['name' => 'home-content',
                            'frontendPanelTitle' => 'Etusivuteksti']) ?>
    </div>
    <footer>
        &copy; MySite <?= date('Y') ?>
    </footer>
</body>
</html>