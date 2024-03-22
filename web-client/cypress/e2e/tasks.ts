import { Set } from 'immutable'

import { defaultTasks } from '@epfml/discojs-core'

export const TASKS = Set.of(
  defaultTasks.titanic.getTask(),
  defaultTasks.mnist.getTask(),
  defaultTasks.cifar10.getTask()
)
