local vtree, data = ...

vtree:e("footer", nil,
    vtree:e("div", nil, data.content)
)