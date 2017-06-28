/*
 * Bedrock REST module.
 *
 * Copyright (c) 2012-2015 Digital Bazaar, Inc. All rights reserved.
 */
var async = require('async');
var bedrock = require('bedrock');
var validate = require('bedrock-validation').validate;
var views = require('bedrock-views');
var BedrockError = bedrock.util.BedrockError;

// module API
var api = {};
module.exports = api;

/**
 * List of default acceptable "Accept" header MIME types for linked data.
 */
var DEFAULT_LINKED_DATA_TYPES = [
  'application/ld+json',
  'application/json'
];

/**
 * List of default acceptable "Accept" header MIME types.
 */
var DEFAULT_ACCEPTABLE_TYPES = [
  'text/html',
  'application/ld+json',
  'application/json'
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
  var regex = /[a-zA-Z0-9][\-a-zA-Z0-9~_\.]*/;
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
 * @param options the handler options.
 *   validate: content to pass to bedrock.validation.validate
 *   get(req, res, callback(err, data)): get resource data
 *   template: template file name for HTML mode (default: 'main.html')
 *   templateNeedsResource: boolean flag to get resource for template
 *   updateVars(resource, vars, callback(err)): update vars with resource
 */
api.makeResourceHandler = function(options) {
  options = options || {};
  var middleware = [];
  // optional validation
  if(options.validate) {
    middleware.push(validate(options.validate));
  }
  // main handler
  middleware.push(function(req, res, next) {
    function _json() {
      if(!options.get) {
        res.sendStatus(204);
        return;
      }
      _getResource(req, res, options, function(err, data) {
        if(err) {
          return next(err);
        }
        res.json(data);
      });
    }
    function _html() {
      async.auto({
        vars: function(callback) {
          views.getDefaultViewVars(req, callback);
        },
        resource: ['vars', function(callback) {
          if(options.templateNeedsResource) {
            return _getResource(req, res, options, callback);
          }
          callback();
        }],
        updateVars: ['resource', function(callback, results) {
          if(options.templateNeedsResource && options.updateVars) {
            return options.updateVars(
              results.resource, results.vars, callback);
          }
          callback();
        }]
      }, function(err, results) {
        if(err) {
          return next(err);
        }
        // FIXME use option for template name
        res.render(options.template || 'main.html', results.vars);
      });
    }
    res.format({
      'application/ld+json': _json,
      json: _json,
      html: _html,
      'default': function() {
        next(new BedrockError(
          'Requested content types not acceptable.',
          'NotAcceptable', {
            'public': true,
            httpStatusCode: 406,
            details: {
              acceptable: [
                'application/json',
                'application/ld+json',
                'text/html'
              ]
            }
          }));
      }
    });
  });
  return async.applyEachSeries(middleware);
};

/**
 * Wrapper to get resources and handle error mapping.
 */
function _getResource(req, res, options, callback) {
  return options.get(req, res, function(err, data) {
    if(err) {
      return callback(err);
    }
    callback(null, data);
  });
}

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
  return api.when(function(req, res) {
    return preferred.indexOf(req.accepts(acceptable)) !== -1;
  });
};

/**
 * Adds an `ld` shortcut to `when.prefers` to check if a request prefers
 * json-ld.
 */
api.when.prefers.jsonld = api.when.prefers(
  DEFAULT_ACCEPTABLE_TYPES, ['application/ld+json', 'application/json']);

/**
 * Adds an `ld` shortcut to `when.prefers` to check if a request prefers
 * linked data.
 */
api.when.prefers.ld = api.when.prefers(
  DEFAULT_ACCEPTABLE_TYPES, DEFAULT_LINKED_DATA_TYPES);

/**
 * Make middleware for a type negotiated REST resource.
 *
 * FIXME: Add docs.
 *
 * @param options the handler options.
 *   validate: content to pass to bedrock.validation.validate
 *   get(req, res, callback(err, data)): get resource data
 */
api.linkedDataHandler = function(options) {
  options = options || {};
  var middleware = [];
  // optional validation
  if(options.validate) {
    middleware.push(validate(options.validate));
  }
  // main handler
  middleware.push(function(req, res, next) {
    function _json() {
      if(!options.get) {
        res.sendStatus(204);
        return;
      }
      _getResource(req, res, options, function(err, data) {
        if(err) {
          return next(err);
        }
        res.json(data);
      });
    }
    res.format({
      'application/ld+json': _json,
      json: _json,
      'default': function() {
        next(new BedrockError(
          'Requested content types not acceptable.',
          'NotAcceptable', {
            'public': true,
            httpStatusCode: 406,
            details: {
              acceptable: DEFAULT_ACCEPTABLE_TYPES
            }
          }));
      }
    });
  });
  return async.applyEachSeries(middleware);
};
