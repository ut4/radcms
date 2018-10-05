local vtree, dc = ...

function map(items, fn)
    local out = {}
    for i = 1, #items do
        table.insert(out, fn(items[i], i-1))
    end
    return out
end

vtree:e("html", nil, {
    vtree:e("title", nil, "My page"),
    vtree:e("body", nil, {
        dc:renderAll("Article"):using("articles.lua"),
        dc:renderOne("Generic"):where("name=\"Footer\""):using("footer.lua")
    })
})

--[[ luax equivalent
<html>
    <title>My page</title>
    <body>
        <h1>Hello world</h1>
        <div>
            <ul>{ map({"A", "B", "C"}, function (str)
                return <li>Todo item { str }</li>
            end }<ul>
        </div>
    <body>
</html>
--]]