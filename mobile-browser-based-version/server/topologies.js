class TreeNode {
    constructor(id){
        this.id = id
        this.left_child = null
        this.right_child = null
        this.parent = null
    }

    addChild(child, left){
        if (left) {
            this.left_child = child
        }
        else {
            this.right_child = child
        }
    }
}

class BinaryTree {
    constructor() {
        this.root = null
        this.index = {};
    }
    
    addPeer(id) {
        let new_node = new TreeNode(id)
        if (this.root == null) {
            this.root = new_node
        }
        else {
            let parent = this.findParent()
            if (parent.left_child == null) {
                parent.left_child = new_node
            }
            else {
                parent.right_child = new_node
            }
            new_node.parent = parent
        }
        this.index[id] = new_node
    }

    findParent() {
        let queue = []

        queue.push(this.root)
    
        while(queue.length > 0){
            let node = queue[0]
            if (node.left_child == null || node.right_child == null) {
                return node
            }
            queue.shift()
            if (node.left_child != null) {
                queue.push(node.left_child)
            }
            if (node.right_child != null) {
                queue.push(node.right_child)
            }
        }
    }

    removePeer(node_id) {
        let node = this.index[node_id]

        let deepestNodeResult = {'node': null, 'max_level': -1}
        this.findDeepestNode(node, 0, deepestNodeResult)

        let deepest_node = deepestNodeResult['node']
        if (deepest_node.parent == null) {
            this.root = null
            return
        }
        let remove_left = deepest_node.parent.left_child == deepest_node ? true : false

        let child_id = deepest_node.id
        let deepest_parent = deepest_node.parent

        let current = deepest_parent
        while (current != node.parent) {
            let tmp = current.id
            current.id = child_id
            this.index[current.id] = current
            child_id = tmp
            current = current.parent
        }
        
        if (remove_left) {
            deepest_parent.left_child = null
        }
        else {
            deepest_parent.right_child = null
        }
        delete this.index[node_id]
    }

    findDeepestNode(root, level, result) {
        if (root != null) {
            level = level + 1
            this.findDeepestNode(root.left_child, level, result)

            if (level > result['max_level']) {
                result['max_level'] = level
                result['node'] = root
            }

            this.findDeepestNode(root.right_child, level, result)
        }
    }

    getNeighbours(node_id) {
        node = this.index[node_id]
        neighbours = []
        if (node.parent != null) {
            neighbours.push[node.parent]
        }
        if (node.left_child != null) {
            neighbours.push[node.left_child]
        }
        if (node.right_child != null) {
            neighbours.push[node.right_child]
        }
        return neighbours
    }

    printTree() {
        this.printNode(this.root, 1)
    }

    printNode(node, indent){
        if (node != null){
            console.log("--".repeat(indent), node.id)
            this.printNode(node.left_child, indent+1)
            this.printNode(node.right_child, indent+1)
        }
    }
  }

module.exports = {
    BinaryTree : BinaryTree
}