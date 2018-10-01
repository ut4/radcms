const {VTree} = require('./vtree.js')
const {fetchData, DocumentDataConfig} = require('./data-access.js')
const {getLayoutFn, getTemplateFn} = require('./template-access.js')

class WebSite {
    constructor() {
        this.pages = []
    }
    getPages() {
        return this.pages
    }
}

class Page {
    constructor(url, html) {
        this.url = url
        this.html = html
    }
}

function generate(vtree, ddc, out = new WebSite(), url = '/') {
    const batchConfigs = ddc.getBatchConfigs()
    // 1. Fetch data for each { renderAll('Something') } from database
    const data = fetchData(batchConfigs)
    // 2. Render each { renderAll(...).using(tempatename.tmpl) }
    const renderedTemplates = batchConfigs.map((bc, i) => {
        const tmplVtree = new VTree()
        // Read and compile the template function
        const templateFn = getTemplateFn(bc.renderUsing, tmplVtree)
        // Call it
        templateFn(data[i])
        tmplVtree.done()
        vtree.getChildTrees().push(tmplVtree)
        // tmplVtree.out is now populated, render the batch
        return {batchId: bc.id, render: tmplVtree.toHtml()}
    })
    // 3. Substitute each { renderAll(...) } with rendered strings
    vtree.traverse([vtree.out[0]], (node, parent) => {
        if (node.constructor.name == 'DataBatchConfig') {
            parent.children[parent.children.indexOf(node)] = renderedTemplates
                .find(t => t.batchId == node.id).render
        }
    })
    // 4. Generate the document
    const doc = new Page(url, vtree.toHtml())
    out.getPages().push(doc)
    // 5. Generate some more documents by following the <link>s
    for (let link of vtree.getNodesByTagName('link')) {
        const pageVtree = new VTree()
        const pageDataConfig = new DocumentDataConfig()
        const layoutTemplateFn = getLayoutFn(link.props.layout, pageVtree, pageDataConfig)
        layoutTemplateFn(link.props.href)
        pageVtree.done()
        generate(pageVtree, pageDataConfig, out, link.props.href)
    }
    // 6. Done
    return out
}

module.exports = {generate}
