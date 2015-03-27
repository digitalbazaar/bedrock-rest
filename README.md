# bedrock-rest

A [bedrock][] module that adds helpers for REST support.

## Quick Examples

```
npm install bedrock-rest
```

```js
var bedrock = require('bedrock');
var brIdentity = require('bedrock-identity');
var brPassport = require('bedrock-passport');
var brRest = require('bedrock-rest');
var cors = require('cors');
var myItems = require('my-items-library');

bedrock.events.on('bedrock-express.init', function(app) {
  app.param('identity', brRest.idParam);
});

bedrock.events.on('bedrock-express.configure.routes', addRoutes);

function addRoutes(app) {
  var idPath = bedrock.config.identity.basePath + '/:identity';

  app.get(idPath + '/dashboard',
    brPassport.ensureAuthenticated,
    brRest.makeResourceHandler());

  app.options(idPath + '/items', cors());
  app.get(idPath + '/items',
    cors(),
    brRest.makeResourceHandler({
      get: function(req, res, callback) {
        var identityId = brIdentity.createIdentityId(req.params.identity);

        myItems.getItems(identityId, function(err, items) {
          if(err) {
            return callback(err);
          }
          callback(null, items);
        });
      }
    }));

  app.options(idPath + '/items/:item', cors());
  app.get(idPath + '/items/:item',
    cors(),
    brRest.makeResourceHandler({
      get: function(req, res, callback) {
        var identityId = brIdentity.createIdentityId(req.params.identity);
        var itemId = myItems.createItemId(identityId, req.params.item);

        myItems.getItem({id: itemId}, function(err, item) {
          callback(err, item);
        });
      },
      template: 'item.html',
      templateNeedsResource: true,
      updateVars: function(resource, vars, callback) {
        vars.item = resource;
        callback();
      }
    }));
}
```

## API

### idParam(req, res, next, id)

Validates an ID from a URL path and, it passes validation, it will be
available via req.params. This method is for use with [express][] or
[bedrock-express][]:

```js
// passed to an express server's param call
server.param(':foo', rest.idParam);

// setup with "bedrock-express.init" event
bedrock.events.on('bedrock-express.init', function(app) {
  app.param('foo', rest.idParam);
});
```

### makeResourceHandler(options)

Make middleware for a type negotiated REST resource. This middleware handles
the details of handling requests for `json`, `application/ld+json`, and
`html`. JSON based requests will just return the data from the `get` option.
HTML requests will return a HTML template as needed. It defaults to
`main.html` which could be setup to start a single page app that could
include the data with `updateVars` or re-call the resource URL and request
JSON based data.

`options`:
- **validate**: content to pass to bedrock.validation.validate
- **get(req, res, callback(err, data))**: get resource data
- **template**: template file name for HTML mode (default: 'main.html')
- **templateNeedsResource**: boolean flag to get resource for template
- **updateVars(resource, vars, callback(err))**: update vars with resource

```js
makeResourceHandler({
  get: function(req, res, callback) {
    myLib.load(..., function(err, resource) {
      if(err) {
        return callback(err);
      }
      callback(null, resource);
    }
  },
  template: 'my-template.html',
  templateNeedsResource: true,
  updateVars = function(resource, vars, callback) {
    vars.resource = resource;
    callback();
  }
});
```

[bedrock]: https://github.com/digitalbazaar/bedrock
[bedrock-express]: https://github.com/digitalbazaar/bedrock-express
[express]: https://github.com/strongloop/express
