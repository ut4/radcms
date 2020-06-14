# Blogisivustopaketti

...

## Layoutit

Layout-templaatit, jotka tämä paketti sisältää. RadCMS valitsee layoutin sivupyynnölle urlin perusteella dynaamisesti. Url-sääntöjä voi muokata `site/Theme.php` -tiedostossa.

### templates/layout.home.tmpl.php

Renderöi urlin `/`.

### templates/layout.article.tmpl.php

Renderöi kaikki `/artikkeli/` -alkuiset urlit.

### templates/layout.generic.tmpl.php

Renderöi kaikki paitsi `templates/layout.home.tmpl.php`:n , ja `templates/layout.article.tmpl.php`:n renderöimät urlit.

## Php-tagit

Tagit, jotka tämä paketti sisältää. Tageja voi kutsua layout-templaateista (kuten `templates/layout.home.tmpl.php`).

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

### Oletustagit

ks. https://todo/stock-content-types.

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
