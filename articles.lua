local vtree, data = ...

function map(items, fn)
    local out = {}
    for i = 1, #items do
        table.insert(out, fn(items[i], i-1))
    end
    return out
end

vtree:e("div", nil, map(data, function (article)
    return vtree:e("article", nil, {
        vtree:e("h2", nil, article.title),
        vtree:e("p", nil, string.sub(article.body, 0, 6) .. "..."),
        vtree:e("link", nil--[[{
            href: "/" + article.title.toLowerCasvtree:e(),
            layout: "article-layout.tmpl"
        }--]], "Click here man")
    })
end))