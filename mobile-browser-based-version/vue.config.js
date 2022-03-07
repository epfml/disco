module.exports = {
  publicPath: process.env.NODE_ENV === 'production' ? '/disco/' : '/',
  chainWebpack: (config) => {
    config.plugin('html').tap((args) => {
      args[0].title = 'Disco'
      return args
    })
  }
}
