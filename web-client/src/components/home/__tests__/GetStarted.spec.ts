import { describe, it, expect } from 'vitest'
import { mount } from  '@vue/test-utils'

import GetStarted from '../GetStarted.vue'

describe('<Landing />', () => {
  it('changes route', () => {
    // TODO: find a way to mock router with the composition API
    const wrapper = mount(GetStarted)
    expect(wrapper.findAll('button')).toHaveLength(3)
  })
})
