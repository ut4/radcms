<!DOCTYPE html>
<html lang="en">
<head>
    <title>Hello</title>
    <meta name="generator" content="RadCMS 0.0.0">
</head>
<body>
    <header>
        <h1>Hello</h1>
    </header>
    <div id="main">
        <?= $this->Generic(['name' => 'home-content',
                            'frontendPanelTitle' => 'Home content']) ?>
    </div>
    <footer>
        &copy; MySite <?= date('Y') ?>
    </footer>
</body>
</html>