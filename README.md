# RAWB Content Cache

This module keeps cached content from a fetch and subscrobes to events on a RAWB Content Service so it can refetch 
when athe correct content is updated at the source.

## How to use

Create a client like this (call it ```content-cache.js``` or something):

```javascript
const ContentClient = require('@24hr/rawb-content-cache');

const config = require('../config');
const logger = require('../logger');

const client = ContentClient({

    // This can be an internal url as in docker-compose or an external url. 
    // It can also contain a port. The content service will by defautl expose internally the default redis port.
    redisUrl: 'redis://url.to.your.service', 

    // The role of this server, since the content service can be run as both draft and live, we need to know which is targeted
    role: config.ROLE,

    // [optional] A logger, like winston. If none is provided, it will fallback to console.log and console.error
    logger,

    // [optional] An api token, that will be used as Bearer, if needed
    apiToken: config.API_TOKEN,

});

// The first parameter is the siteId, which is needed as part of the request in the content service since it might provide data for several sites.
// The second parameter is the resource key.
// The third parameter is the url to fetch the resource. This is typically just the url of the content service with the key, 
// but in some cases it might go trough something else. 
const response = await client.fetch('foo', '/mycoolresource, `http://your.content.service.com/foo`);

console.log(response);
```

In the example above, upon ffetching the data the first time, the content cache module will begin to listen to a redis event for that resource.
When it gets a signal, it will re-fetch the resource with the resource url (third parameter).

### fetch and subscribe

The example above showed the ```fetch``` function.
The client will also expose a function called ```subcribe``` that is a little more barebone:

```javascript
client.subscribe('foo', '/mycoolresource', (data) => {
    console.log('documentType', data.documentType);
    console.log('hash', data.hash);
    console.log('resource', data.resource);
    console.log('externalId', data.externalId);
});
```

The ```subscribe``` function will not fetch anything for you, but will register the callback so you can fetch what you need.
It will not provide you with the content either, just the reference to it. 

## History

- 0.8.1 [2019-09-08] : Updated docs
- 0.8.0 [2019-09-08] : Refactored version with exposed fetch and subcribe after creating a client
- 0.7.0 [2019-09-07] : First functional working

