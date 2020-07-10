<!DOCTYPE html>
<html lang="en">
<head>
    <title>RadCMS - <?= $title ?></title>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="robots" content="noindex,nofollow,noarchive,nosnippet">
    <link rel="stylesheet" href="<?= $this->assetUrl('frontend/rad/vendor/vendor.bundle.css') ?>">
    <link rel="stylesheet" href="<?= $this->assetUrl('frontend/rad/common.css') ?>">
    <style>
        form { max-width: 240px; margin: 0 auto; }
        img { width: 72px; margin: 1rem 0 .4rem; }
    </style>
</head>
<body class="light">
    <div id="<?= $reactAppName ?>"></div>
    <script src="<?= $this->assetUrl('frontend/rad/vendor/vendor.bundle.min.js') ?>"></script>
    <script src="<?= $this->assetUrl('frontend/rad/rad-commons.js') ?>"></script>
    <script src="<?= $this->assetUrl('frontend/rad/rad-auth-apps.js') ?>"></script>
    <script>
        radCommons.urlUtils.baseUrl = '<?= $this->url('/') ?>';
        radCommons.urlUtils.assetBaseUrl = '<?= $this->assetUrl('/') ?>';
        preact.render(preact.createElement(radAuthApps.<?= $reactAppName ?>),
                      document.getElementById('<?= $reactAppName ?>'));
    </script>
</body>