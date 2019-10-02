<div>
<?php foreach ($articles as $art): ?>
    <article>
        <h2><?= $art->title ?></h2>
        <div>
            <p><?= substr($art->body, 0, 6) . '... ' ?></p>
            <a href="<?= $Url($art->defaults->name[0] !== '/'
                    ? '/' . $art->defaults->name
                    : $art->defaults->name) ?>">Lue lisää</a>
        </div>
    </article>
<?php endforeach; ?>
</div>