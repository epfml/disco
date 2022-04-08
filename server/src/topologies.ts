import { Stack } from 'immutable'

class TreeNode<ID> {
  leftChild?: TreeNode<ID>
  rightChild?: TreeNode<ID>

  constructor (
    public id: ID,
    public parent?: TreeNode<ID>
  ) {}

  addChild (child: TreeNode<ID>, left: boolean): void {
    if (left) {
      this.leftChild = child
    } else {
      this.rightChild = child
    }
  }

  findDeepestNode (): { node: TreeNode<ID>, level: number } {
    const defaultNode = { node: this, level: 0 }

    const left = this.leftChild?.findDeepestNode() ?? defaultNode
    const right = this.rightChild?.findDeepestNode() ?? defaultNode

    if (left.level >= right.level) {
      left.level++
      return left
    } else {
      right.level++
      return right
    }
  }
}

class BinaryTree<ID> {
  private root: TreeNode<ID> | undefined
  private readonly index = new Map<ID, TreeNode<ID>>()

  addPeer (id: ID): Set<TreeNode<ID>> {
    const affectedPeers = new Set<TreeNode<ID>>()

    let newNode
    if (this.root === undefined) {
      newNode = new TreeNode<ID>(id)
      this.root = newNode
    } else {
      const parent = this.findParent()
      if (parent === undefined) {
        throw new Error('no parent found')
      }
      affectedPeers.add(parent)
      newNode = new TreeNode<ID>(id, parent)
      if (parent.leftChild === undefined) {
        parent.leftChild = newNode
      } else {
        parent.rightChild = newNode
      }
    }

    this.index.set(id, newNode)
    return affectedPeers
  }

  findParent (): TreeNode<ID> | undefined {
    let queue = Stack.of(this.root)
    for (;;) {
      const node = queue.first()
      if (node === undefined) {
        break
      }

      if (node.leftChild === undefined || node.rightChild === undefined) {
        return node
      }

      if (node.leftChild !== undefined) {
        queue = queue.shift().push(node.leftChild)
      }
      if (node.rightChild !== undefined) {
        queue = queue.shift().push(node.rightChild)
      }
    }

    return undefined
  }

  removePeer (nodeId: ID): Set<ID> {
    const node = this.index.get(nodeId)
    if (node === undefined) {
      throw new Error('no such ID')
    }

    const deepestNodeResult = node.findDeepestNode()

    const deepestNode = deepestNodeResult.node
    if (deepestNode.parent === undefined) {
      this.root = undefined
      return new Set()
    }
    const removeLeft = deepestNode.parent.leftChild === deepestNode

    let childId = deepestNode.id
    const deepestParent = deepestNode.parent

    let current: TreeNode<ID> | undefined = deepestParent
    const affectedPeers = new Set<ID>()
    while (current !== node.parent && current !== undefined) {
      const currentNeighbours = this.getNeighbours(current.id)
      currentNeighbours.forEach((neighbour) => affectedPeers.add(neighbour))
      const tmp = current.id
      current.id = childId
      this.index.set(current.id, current)
      childId = tmp
      current = current.parent
    }
    affectedPeers.delete(nodeId)

    if (removeLeft) {
      deepestParent.leftChild = undefined
    } else {
      deepestParent.rightChild = undefined
    }
    this.index.delete(nodeId)

    return affectedPeers
  }

  getNeighbours (nodeId: ID): ID[] {
    const node = this.index.get(nodeId)
    if (node === undefined) {
      throw new Error('no such ID')
    }

    const neighbours = []
    if (node.parent !== undefined) {
      neighbours.push(node.parent.id)
    }
    if (node.leftChild !== undefined) {
      neighbours.push(node.leftChild.id)
    }
    if (node.rightChild !== undefined) {
      neighbours.push(node.rightChild.id)
    }
    return neighbours
  }

  printTree (): void {
    if (this.root === undefined) {
      console.log('[undefined root]')
    } else {
      this.printNode(this.root, 1)
    }
  }

  printNode (node: TreeNode<ID> | undefined, indent: number): void {
    if (node !== undefined) {
      console.log('--'.repeat(indent), node.id)
      this.printNode(node.leftChild, indent + 1)
      this.printNode(node.rightChild, indent + 1)
    }
  }
}

export default BinaryTree
