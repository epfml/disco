module.exports = {
  publicPath: process.env.NODE_ENV === 'production' ? '/disco/' : '/',
  configureWebpack: {
    module: { noParse: /wrtc/ },
    resolve: {
      fallback: { path: require.resolve('path-browserify') }
    }
  },
  chainWebpack: (config) => {
    config.plugin('html').tap((args) => {
      args[0].title = 'Disco'
      return args
    })
  }
}
