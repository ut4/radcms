# Blogisivupaketti

...

## Layoutit

Layout-templaatit, jotka tämä paketti sisältää. Layout valitaan urlin perusteella dynaamisesti. Sääntöjä voi muokata `site.json` -tiedostosta.

### main-layout.tmpl.php

Listaa kaikki artikkelit. Renderöi kaikki, paitsi /artikkelit/-alkuiset urlit.

### article-layout.tmpl.php

Näyttää yhden artikkelin. Renderöi kaikki /artikkelit/-alkuiset urlit.

## Php-tagit

Tagit, jotka tämä paketti sisältää. Tageja voi kutsua layout-templaateista (kuten main-layout.tmpl.php).

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

Sisältötyypit, jotka tämä paketti rekisteröi. Sisältötyypin sisältöä voidaan hakea tietokannasta php-tiedostoista. Uusia sisältötyyppejä voi luoda muokkaamalla `site.json` -tiedostoa (RAD_DEVMODE tulee olla päällä).

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
