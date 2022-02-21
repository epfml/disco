// Setup ENV for all tests
before(() => {
  process.env.NODE_ENV = 'development'
  console.log('Setting up NODE_ENV to', process.env.NODE_ENV)
  console.log('***********************************\n\n')
  // Load .env.development
  require('dotenv-flow').config()
})
