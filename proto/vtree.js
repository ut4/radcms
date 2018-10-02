class Node {
    constructor(tag, props, id, content) {
        this.tag = tag
        this.props = props
        this.id = id
        this.content = content
    }
}

class VTree {
    constructor() {
        this.idCounter = 0
        this.out = []
        this.childTrees = []
    }
    e(tag, props, content) {
        this.out.unshift(new Node(tag, props, this.idCounter, content))
        this.idCounter++
        return this.out[0]
    }
    getChildTrees() {
        return this.childTrees
    }
    getNodesByTagName(tagName) {
        var out = []
        this.traverse([this.out[0]], node => {
            if (node.tag === tagName) out.push(node)
        }, null, true)
        return out
    }
    toHtml() {
        if (!this.out.length) {
            throw new Error('this.out == empty')
        }
        return render([this.out[0]])
    }
    traverse(branch, fn, parentNode = null, includeChildTrees = false) {
        for (let node of branch) {
            fn(node, parentNode)
            if (Array.isArray(node.content) && node.content.length) {
                this.traverse(node.content, fn, node)
            }
        }
        if (includeChildTrees) {
            for (let tree of this.childTrees) {
                this.traverse([tree.out[0]], fn, null, false) // only one level
            }
        }
    }
}

function render(branch, level = 0) {
    var out = ''
    for (let node of branch) {
        const indent = '   '.repeat(level)
        if (typeof node == 'string') {
            out += node
            continue
        }
        out += indent + '<' + node.tag + '>\n'
        if (typeof node.content == 'string') {
            out += node.content
        } else if (node.content.length) {
            out += render(node.content, level + 1)
        }
        out += '\n' + indent + '</' + node.tag + '>\n'
    }
    return out
}

module.exports = {VTree}