import { defaultTasks } from '@epfml/discojs-core'

// most basic disco tasks
export default [
  defaultTasks.titanic.getTask(),
  defaultTasks.mnist.getTask(),
  defaultTasks.cifar10.getTask()
]
