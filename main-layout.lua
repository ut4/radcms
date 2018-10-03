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
        vtree:e("h1", nil, "Hello world"),
        vtree:e("div", nil,
            vtree:e("ul", nil, map({"A", "B", "C"}, function (str)
                return vtree:e("li", nil, "Todo item " .. str)
            end))
        )
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