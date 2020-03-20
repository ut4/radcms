<?php // Lue lisää: https://todo/sivutemplaattien-käyttö. ?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title><?= $site->name ?></title>
    <meta name="generator" content="RadCMS <?= RAD_VERSION ?>">
    <?= $this->cssFiles() ?>
</head>
<body>
    <header>
        <h1>Otsikko</h1>
    </header>
    <div id="main">
        Terve fallback-templaatista.
    </div>
    <?= $this->Footer() ?>
</body>
</html>