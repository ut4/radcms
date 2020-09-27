module.exports = {
    input: 'plugins/RadForms/frontend-src/main.js',
    output: {
        file: 'frontend/plugins/rad-forms/rad-forms-bundled.js',
    },
    jsxTranspile: {
        include: 'plugins/RadForms/frontend-src/**'
    }
};
