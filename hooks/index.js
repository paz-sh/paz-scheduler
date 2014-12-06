module.exports = function (cfg) {
  return {
    deploy: require('./deploy/controller')(cfg),
    dockerhub: require('./dockerhub/controller')(cfg)
  };
};
