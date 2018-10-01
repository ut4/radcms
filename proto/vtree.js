class VTree {
    constructor() {
        this.idCounter = 0
        this.out = []
        this.childTrees = []
    }
    e(tag, props, children) {
        this.out.push({tag, props, id: this.idCounter, children})
        this.idCounter++
        return this.idCounter - 1
    }
    done() {
        this.out = this.out.reverse()
        const reverseId = this.out.length - 1
        for (let node of this.out) {
            if (!Array.isArray(node.children)) continue
            node.children = node.children.map(val =>
                typeof val == 'number' ? this.out[reverseId - val] : val
            )
        }
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
            if (Array.isArray(node.children) && node.children.length) {
                this.traverse(node.children, fn, node)
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
        if (typeof node.children == 'string') {
            out += node.children
        } else if (node.children.length) {
            out += render(node.children, level + 1)
        }
        out += '\n' + indent + '</' + node.tag + '>\n'
    }
    return out
}

module.exports = {VTree}