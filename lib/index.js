/*
 * Bedrock REST module.
 *
 * Copyright (c) 2012-2018 Digital Bazaar, Inc. All rights reserved.
 */
const bedrock = require('bedrock');
const _validate = require('bedrock-validation').validate;
const BedrockError = bedrock.util.BedrockError;

// module API
const api = {};
module.exports = api;

/**
 * List of default acceptable "Accept" header MIME types for JSON-LD.
 */
const DEFAULT_JSON_LD_TYPES = [
  'application/ld+json',
  'application/json'
];

/**
 * List of default acceptable "Accept" header MIME types for linked data.
 */
const DEFAULT_LINKED_DATA_TYPES = [
  'application/ld+json',
  'application/json'
  // TODO: support other types
];

/**
 * List of default acceptable "Accept" header MIME types for HTML.
 */
const DEFAULT_HTML_TYPES = [
  'text/html'
];

/**
 * List of default acceptable "Accept" header MIME types.
 */
const DEFAULT_ACCEPTABLE_TYPES = [
  ...DEFAULT_HTML_TYPES,
  ...DEFAULT_LINKED_DATA_TYPES
];

/**
 * Validates an ID from a URL path and, it passes validation, it will
 * be available via req.params. This method should be passed to an express
 * server's param call, eg:
 *
 * server.param(':foo', idParam)
 *
 * @param req the request.
 * @parma res the response.
 * @param next the next handler.
 * @param id the id.
 */
api.idParam = function(req, res, next, id) {
  const regex = /[a-zA-Z0-9][\-a-zA-Z0-9~_\.]*/;
  if(!regex.test(id)) {
    res.redirect('/');
  } else {
    next();
  }
};

/**
 * Make middleware for a type negotiated REST resource.
 *
 * FIXME: Add docs.
 *
 * JSON handling can be controlled with the 'json' option. A boolean value will
 * turn on or off processing. The string 'route' will use the next middleware.
 *
 * HTML handling can be controlled with the 'html' option. False will turn off
 * processing. The string 'route' will use the next middleware.
 *
 * @param options the handler options.
 *   validate: content to pass to bedrock.validation.validate
 *   get(req, res, callback(err, data)): get resource data
 *   json: handle JSON content types (true, false, 'route')
 *   html: handle HTML content types (true, false)
 */
api.makeResourceHandler = function({
  validate = null,
  get,
  json = true,
  html = 'route'
}) {
  const middleware = [];
  // optional validation
  if(validate) {
    middleware.push(_validate(validate));
  }
  // main handler
  middleware.push(function(req, res, next) {
    function _json() {
      if(!get) {
        res.sendStatus(204);
        return;
      }
      get(req, res, function(err, data) {
        if(err) {
          next(err);
          return;
        }
        res.json(data);
      });
    }
    function _route() {
      next('route');
    }

    const formatOptions = {};
    const acceptable = [];
    if(json) {
      DEFAULT_JSON_LD_TYPES.forEach(type => {
        formatOptions[type] = json === 'route' ? _route : _json;
        acceptable.push(type);
      });
    }
    if(html === 'route') {
      DEFAULT_HTML_TYPES.forEach(type => {
        formatOptions[type] = _route;
        acceptable.push(type);
      });
    }
    formatOptions.default = function() {
      next(new BedrockError(
        'Requested content types not acceptable.',
        'NotAcceptable', {
          public: true,
          httpStatusCode: 406,
          details: {
            acceptable
          }
        }));
    };
    res.format(formatOptions);
  });
  return middleware;
};

/**
 * Make middleware for a type negotiated REST resource.
 *
 * FIXME: Add docs.
 *
 * This is a wrapper around makeResourceHandler with HTML processing disabled.
 *
 * @param options the handler options.
 *   validate: content to pass to bedrock.validation.validate
 *   get(req, res, callback(err, data)): get resource data
 */
api.linkedDataHandler = function(options) {
  return api.makeResourceHandler({
    ...options,
    json: true,
    html: 'route'
  });
};

/**
 * Creates a middleware that will call a boolean function to check if a
 * request is acceptable for subsequently attached middlewares (middlewares
 * that are attached using the same call that attaches this middleware). If it
 * is, next() is called, if not, next('route') is called.
 *
 * This function can also be used as a collection of when functions.
 *   when.prefers.json
 *
 * @param check(req, res): function to check a request. Returns boolean.
 */
api.when = function(check) {
  return function(req, res, next) {
    if(check(req, res)) {
      return next();
    }
    next('route');
  };
};

/**
 * Adds a `prefers` shortcut to `when` to check if, given a set of acceptable
 * types, if a request prefers a type from a list.
 *
 * @param acceptable the known acceptable types for a route.
 * @param preferred a list of preferred types.
 */
api.when.prefers = function(acceptable, preferred) {
  // TODO: remove "acceptable" parameter if not needed
  // TODO: support spread parameters for preferred
  if(!Array.isArray(preferred)) {
    preferred = [preferred];
  }
  /* eslint-disable-next-line no-unused-vars */
  return api.when(function(req, res) {
    return preferred.indexOf(req.accepts(acceptable)) !== -1;
  });
};

/**
 * Adds a `jsonld` shortcut to `when.prefers` to check if a request prefers
 * JSON-LD.
 */
api.when.prefers.jsonld = api.when.prefers(
  DEFAULT_ACCEPTABLE_TYPES, DEFAULT_JSON_LD_TYPES);

/**
 * Adds a `ld` shortcut to `when.prefers` to check if a request prefers
 * linked data.
 */
api.when.prefers.ld = api.when.prefers(
  DEFAULT_ACCEPTABLE_TYPES, DEFAULT_LINKED_DATA_TYPES);
