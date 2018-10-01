function getLayoutFn(fileName, vtree, dataConfig) {
    const e = vtree.e.bind(vtree)
    const renderAll = dataConfig.renderAll.bind(dataConfig)
    const renderOne = dataConfig.renderOne.bind(dataConfig)
    if (fileName == 'default-layout.tmpl') {
        return url => e('html', null, [
            e('title', null, 'My page'),
            e('body', null, [
                renderAll('Article').using('articles.tmpl'),
                renderOne('Generic').where('name="Footer"').using('footer.tmpl')
            ])
        ])
    } else if (fileName == 'article-layout.tmpl') {
        return url => e('html', null, [
            e('title', null, 'My page'),
            e('body', null, [
                renderOne('Article').where('name="'+url.substr(1)+'"').using('article.tmpl'),
                renderOne('Generic').where('name="Footer"').using('footer.tmpl')
            ])
        ])
    } else {
        throw new Error('Shouldn\'t happen')
    }
}

function getTemplateFn(fileName, vtree) {
    const e = vtree.e.bind(vtree)
    if (fileName == 'articles.tmpl') {
        return data => e('div', null, data.map(article => e('div', null, [
            e('h2', null, article.title),
            e('div', null, article.body.substr(0, 6) + '...'),
            e('link', {
                href: '/' + article.title.toLowerCase(),
                layout: 'article-layout.tmpl'
            }, 'Click here man')
        ])))
    } else if (fileName == 'article.tmpl') {
        return data => e('div', null, [
            e('h1', null, data.title),
            e('div', null, data.body),
        ])
    } else if (fileName == 'footer.tmpl') {
        return data => e('footer', null, [
            e('div', null, data.content)
        ])
    } else {
        throw new Error('Shouldn\'t happen')
    }
}

module.exports = {getLayoutFn, getTemplateFn}
