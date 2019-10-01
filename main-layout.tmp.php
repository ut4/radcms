<?php list($arts, $footer) = $fetchAll("Articles")
                            ->fetchOne("Generic blobs")->where("name='footer'")
                            ->exec(); ?>
<!DOCTYPE html>
<html lang="fi">
    <head>
        <title>Hello</title>
    </head>
    <body>
        <?= $ArticleList($arts) ?>
        <footer><?= $footer->content ?></footer>
    </body>
</html>