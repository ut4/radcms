<?php

/*
 * Sivuston lokaatio serverin roottiin verrattuna, esim. '/' viittaa
 * 'http://site.com/' & '<public_html>/', ja '/foo' viittaa
 * 'http://site.com/foo/' & '<public_html>/foo/'.
 */
define('RAD_BASE_URL', '/');

/*
 * RadCMS:n backend-koodin (kansio, jossa /src ja /vendor) absoluuttinen sijain-
 * ti. Trailing slash pakollinen.
 */
define('RAD_BASE_PATH', '/user/me/rad-backend/');

/*
 * Sivuston omien tiedostojen (templaatit, teematiedostot jne.) absoluuttinen
 * sijainti. RAD_BASE_URLin fyysinen sijainti. Trailing slash pakollinen.
 */
define('RAD_SITE_PATH', '/var/www/html/');
