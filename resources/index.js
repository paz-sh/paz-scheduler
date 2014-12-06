module.exports = function(cfg) {
  return {
    config: require('./config/controller')(cfg)
  };
};
