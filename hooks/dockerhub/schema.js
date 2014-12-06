var joi = require('joi');

/* eslint-disable camelcase */

module.exports = {
  push_data: joi.object().keys({
    pushed_at: joi.number(),
    images: joi.array().includes(joi.string()),
    pusher: joi.string()
  }),
  repository: joi.object().keys({
    status: joi.string(),
    description: joi.string().allow(['', null]),
    is_trusted: false,
    full_description: joi.string().allow(['', null]),
    repo_url: joi.string().required(),
    owner: joi.string(),
    is_official: false,
    is_private: false,
    name: joi.string(),
    namespace: joi.string(),
    star_count: joi.number(),
    comment_count: joi.number(),
    date_created: joi.number(),
    dockerfile: joi.string(),
    repo_name: joi.string().required()
  }).required()
};

/* eslint-enable camelcase */
