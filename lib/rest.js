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
function _getResource(res, req, options, callback) {
  return options.get(res, req, function(err, data) {
    if(err) {
      return callback(err);
    }
    callback(null, data);
  });
}
