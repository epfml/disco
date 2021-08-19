module.exports = {
  publicPath: process.env.NODE_ENV === 'production' ? '/DeAI/' : '/',
  chainWebpack: config => {
    config.plugin('html').tap(args => {
      args[0].title = 'DeAI';
      return args;
    });
  },
};
