import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: { baseUrl: 'http://localhost:8081/' },
  component: {
    devServer: {
      framework: 'vue-cli',
      bundler: 'webpack'
    }
  }
})
