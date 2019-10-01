<?php list($art, $footer) = $fetchOne("Articles")->where("name='{$url[0]}'")
                           ->fetchOne("Generic blobs")->where("name='footer'")->exec(); ?>
<!DOCTYPE html>
<html lang="fi">
    <head>
        <title><?= $art->title ?></title>
    </head>
    <body>
        <a href="<?= $makeUrl('/') ?>">Takaisin</a>
        <article>
            <h2><?= $art->title ?></h2>
            <div><?= $art->body ?></div>
        </article>
        <footer><?= $footer->content ?></footer>
    </body>
</html>