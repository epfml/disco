module.exports = {
  publicPath: process.env.NODE_ENV === 'production' ? '/FeAI/' : '/',
  chainWebpack: config => {
    config.plugin('html').tap(args => {
      args[0].title = 'FeAI';
      return args;
    });
  },
};
