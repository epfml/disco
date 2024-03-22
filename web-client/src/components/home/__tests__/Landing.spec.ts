import { describe, it, expect } from 'vitest'
import { mount } from  '@vue/test-utils'

import Landing from '../Landing.vue'

describe('<Landing />', () => {
  it('emits', () => {
    const wrapper = mount(Landing)

    wrapper.get('button').trigger('click')

    expect(wrapper.emitted()).toHaveProperty('got-started')
  })
})
