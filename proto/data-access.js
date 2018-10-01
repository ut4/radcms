class DataBatchConfig {
    constructor(contentType, doFetchAll, id) {
        this.contentType = contentType
        this.renderUsing = null
        this.order = null
        this.doFetchAll = doFetchAll
        this.wheres = []
        this.id = id
    }
    using(renderUsing) {
        this.renderUsing = renderUsing
        return this
    }
    orderBy(order) {
        this.order = order
        return this
    }
    where(str) {
        this.wheres.push(str)
        return this
    }
}

class DocumentDataConfig {
    constructor() {
        this.batchIdCounter = 0
        this.batches = []
    }
    getBatchConfigs() {
        return this.batches
    }
    renderAll(contentType) {
        this.batches.push(new DataBatchConfig(contentType, true, this.batchIdCounter))
        this.batchIdCounter++
        return this.batches[this.batches.length - 1]
    }
    renderOne(contentType) {
        this.batches.push(new DataBatchConfig(contentType, false, this.batchIdCounter))
        this.batchIdCounter++
        return this.batches[this.batches.length - 1]
    }
}

function fetchData(dataBatchConfigs) {
    const articles = [
        {title: "Article1", body: "Foo bar..."},
        {title: "Article2", body: "Baz naz..."},
        {title: "Article3", body: "Fas gas..."}
    ]
    return dataBatchConfigs.map(dbc => {
        if (dbc.doFetchAll) {
            return articles
        } else if (dbc.contentType == "Generic" && dbc.wheres[0] == 'name="Footer"') {
            return {content: "(c) 2005 MySite"}
        } else if (dbc.contentType == "Article" && dbc.wheres[0] == 'name="article1"') {
            return articles[0]
        } else if (dbc.contentType == "Article" && dbc.wheres[0] == 'name="article2"') {
            return articles[1]
        } else if (dbc.contentType == "Article" && dbc.wheres[0] == 'name="article3"') {
            return articles[2]
        } else {
            throw new Error('Shouldn\'t happen')
        }
    })
}

module.exports = {DocumentDataConfig, fetchData}
