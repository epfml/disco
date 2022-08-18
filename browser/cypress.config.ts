import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    // TODO: env var
    baseUrl: 'http://localhost:8081/#/',
    setupNodeEvents (on, config) {
      // implement node event listeners here
    }
  },

  component: {
    devServer: {
      framework: 'vue-cli',
      bundler: 'webpack'
    }
  }
})
