import InstallApp from './src/InstallApp.jsx';

preact.render(preact.createElement(InstallApp, {siteDirPath: window.siteDirPath}),
              document.getElementById('install-app'));
