# Perussivustopaketti

...

## Layoutit

Layout-templaatit, jotka tämä paketti sisältää. RadCMS valitsee layoutin sivupyynnölle urlin perusteella dynaamisesti. Url-sääntöjä voi muokata `site/Theme.php` -tiedostossa.

### templates/layout.full-width.tmpl.php

Renderöi kaikki urlit paitsi `/palvelut`.

### templates/layout.with-sidebar.tmpl.php

Renderöi `/palvelut`.

## Php-tagit

Tagit, jotka tämä paketti sisältää. Tageja voi kutsua layout-templaateista (kuten `templates/layout.generic.tmpl.php`).

### MainMenu()

Esimerkki:
```php
<html>
...
<body>
<header><?= $this->MainMenu(); ?></header>
</body>
</html>
```

### ContentCompany(['content' => object])

ks. `templates/layout.with-sidebar.tmpl.php`.

### ContentDefault(['content' => object])

ks. `templates/layout.full-width.tmpl.php`.

### ContentServices(['content' => object])

ks. `templates/layout.full-width.tmpl.php`.

### Oletustagit

ks. https://todo/stock-content-types.

## Sisältötyypit

Sisältötyypit, jotka tämä teema sisältää. Sisältötyypin sisältöä voidaan hakea tietokannasta php-tiedostoista. Uusia sisältötyyppejä voi luoda hallintapaneelin devaaja-osiosta.

ks. https://todo/stock-content-types.
