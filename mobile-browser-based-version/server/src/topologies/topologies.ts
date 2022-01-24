class TreeNode {
  constructor(id) {
    this.id = id;
    this.leftChild = null;
    this.rightChild = null;
    this.parent = null;
  }

  addChild(child, left) {
    if (left) {
      this.leftChild = child;
    } else {
      this.rightChild = child;
    }
  }
}

class BinaryTree {
  constructor() {
    this.root = null;
    this.index = {};
  }

  addPeer(id) {
    let affectedPeers = new Set();
    let newNode = new TreeNode(id);
    if (this.root == null) {
      this.root = newNode;
    } else {
      let parent = this.findParent();
      affectedPeers.add(parent);
      if (parent.leftChild == null) {
        parent.leftChild = newNode;
      } else {
        parent.rightChild = newNode;
      }
      newNode.parent = parent;
    }
    this.index[id] = newNode;
    return affectedPeers;
  }

  findParent() {
    let queue = [];

    queue.push(this.root);

    while (queue.length > 0) {
      let node = queue[0];
      if (node.leftChild == null || node.rightChild == null) {
        return node;
      }
      queue.shift();
      if (node.leftChild != null) {
        queue.push(node.leftChild);
      }
      if (node.rightChild != null) {
        queue.push(node.rightChild);
      }
    }
  }

  removePeer(nodeId) {
    let node = this.index[nodeId];

    let deepestNodeResult = { node: null, max_level: -1 };
    this.findDeepestNode(node, 0, deepestNodeResult);

    let deepestNode = deepestNodeResult['node'];
    if (deepestNode.parent == null) {
      this.root = null;
      return;
    }
    let removeLeft = deepestNode.parent.leftChild == deepestNode ? true : false;

    let childId = deepestNode.id;
    let deepestParent = deepestNode.parent;

    let current = deepestParent;
    let affectedPeers = new Set();
    while (current != node.parent) {
      let currentNeighbours = this.getNeighbours(current.id);
      currentNeighbours.forEach(neighbour => affectedPeers.add(neighbour));
      let tmp = current.id;
      current.id = childId;
      this.index[current.id] = current;
      childId = tmp;
      current = current.parent;
    }
    affectedPeers.delete(nodeId);

    if (removeLeft) {
      deepestParent.leftChild = null;
    } else {
      deepestParent.rightChild = null;
    }
    delete this.index[nodeId];

    return affectedPeers;
  }

  findDeepestNode(root, level, result) {
    if (root != null) {
      level = level + 1;
      this.findDeepestNode(root.leftChild, level, result);

      if (level > result['max_level']) {
        result['max_level'] = level;
        result['node'] = root;
      }

      this.findDeepestNode(root.rightChild, level, result);
    }
  }

  getNeighbours(nodeId) {
    let node = this.index[nodeId];
    let neighbours = [];
    if (node.parent != null) {
      neighbours.push(node.parent.id);
    }
    if (node.leftChild != null) {
      neighbours.push(node.leftChild.id);
    }
    if (node.rightChild != null) {
      neighbours.push(node.rightChild.id);
    }
    return neighbours;
  }

  printTree() {
    this.printNode(this.root, 1);
  }

  printNode(node, indent) {
    if (node != null) {
      console.log('--'.repeat(indent), node.id);
      this.printNode(node.leftChild, indent + 1);
      this.printNode(node.rightChild, indent + 1);
    }
  }
}

export default BinaryTree;
