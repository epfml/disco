module.exports = {
  publicPath: process.env.NODE_ENV === 'production' ? '/disco/' : '/',
  configureWebpack: {
    resolve: {
      fallback: {
        crypto: require.resolve('crypto-browserify'),
        path: require.resolve('path-browserify'),
        stream: require.resolve('stream-browserify')
      }
    }
  },
  chainWebpack: (config) => {
    config.plugin('html').tap((args) => {
      args[0].title = 'Disco'
      return args
    })
  }
}
