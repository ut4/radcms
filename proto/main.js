const {VTree} = require('./vtree.js')
const {generate} = require('./generator.js')
const {DocumentDataConfig} = require('./data-access.js')
const {getLayoutFn} = require('./template-access.js')

const homePageVTree = new VTree()
const homePageDataConfig = new DocumentDataConfig()
const layoutTemplateFn = getLayoutFn('default-layout.tmpl', homePageVTree, homePageDataConfig)
layoutTemplateFn('/')
homePageVTree.done()
const webSite = generate(homePageVTree, homePageDataConfig)

console.log('== Output ==')
webSite.getPages().forEach(page => {
    console.log(page)
    console.log('--')
})