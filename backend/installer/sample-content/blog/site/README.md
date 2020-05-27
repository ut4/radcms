# Blogisivupaketti

...

## Layoutit

Layout-templaatit, jotka tämä paketti sisältää. RadCMS valitsee layoutin sivupyynnölle urlin perusteella dynaamisesti. Url-sääntöjä voi muokata `site/Site.php` -tiedostossa.

### layout.home.tmpl.php

Renderöi urlin `/`.

### layout.article.tmpl.php

Renderöi kaikki `/artikkeli/` -alkuiset urlit.

### layout.generic.tmpl.php

Renderöi kaikki paitsi `layout.home.tmpl.php`:n , ja `layout.article.tmpl.php`:n renderöimät urlit.

## Php-tagit

Tagit, jotka tämä paketti sisältää. Tageja voi kutsua layout-templaateista (kuten `layout.home.tmpl.php`).

ks. https://todo/stock-content-types.

### Articles(['frontendPanelTitle?' => string])

Esimerkki:
```php
<html>
...
<body>
<div><?= $this->Articles(['frontendPanelTitle' => 'Etusivun artikkelit']); ?></div>
</body>
</html>
```

### Article(['slug' => string, 'frontendPanelTitle?' => string, 'bindTo?' => &object])

Esimerkki:
```php
<html>
...
<body>
<article><?= $this->Article(['slug' => $url[0]]); ?></article>
</body>
</html>
```

## Sisältötyypit

Sisältötyypit, jotka tämä paketti rekisteröi. Sisältötyypin sisältöä voidaan hakea tietokannasta php-tiedostoista. Uusia sisältötyyppejä voi luoda hallintapaneelin devaaja-osiosta.

ks. https://todo/stock-content-types.

### Articles

```json
{
    "name": "Articles",
    "friendlyName": "Artikkelit",
    "fields": [
        {"name": "title", "friendlyName": "Otsikko", "dataType": "text", "widget": "textField"},
        {"name": "slug", "friendlyName": "Slug (url)", "dataType": "text", "widget": "textField"},
        {"name": "body", "friendlyName": "Sisältö", "dataType": "text", "widget": "richText"}
    ]
}
```
