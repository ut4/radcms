# Minimaalinen sivupaketti

...

## Layoutit

Layout-templaatit, jotka tämä paketti sisältää. Layout valitaan urlin perusteella dynaamisesti. Sääntöjä voi muokata `site.json` -tiedostosta.

### main-layout.tmpl.php

todo. Renderöi kaikki urlit.

## Php-tagit

Tagit, jotka tämä paketti sisältää. Tageja voi kutsua layout-templaateista (kuten main-layout.tmpl.php).

### Generic(['name' => string, 'frontendPanelTitle?' => string])

Esimerkki:
```php
<html>
...
<body>
<footer><?= $this->Generic(['name' => 'footer-text',
                            'frontendPanelTitle' => 'Footer']); ?></footer>
</body>
</html>
```

## Sisältötyypit

Sisältötyypit, jotka tämä paketti rekisteröi. Sisältötyypin sisältöä voidaan hakea tietokannasta php-tiedostoista. Uusia sisältötyyppejä voi luoda muokkaamalla `site.json` -tiedostoa (RAD_DEVMODE tulee olla päällä).

### GenericBlobs

```json
{
    "name": "GenericBlobs",
    "friendlyName": "Geneerinen",
    "fields": [
        {"name": "name", "friendlyName": "Nimi", "dataType": "text", "widget": "textField"},
        {"name": "content", "friendlyName": "Sisältö", "dataType": "text", "widget": "richText"}
    ]
}
```