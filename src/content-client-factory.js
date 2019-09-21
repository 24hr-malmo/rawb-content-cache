const nodeFetch = require('node-fetch');
const { mergeDeep } = require('./utils');
const { GraphQLClient } = require('graphql-request');

const ContentClientFactory = ({ redisClient, role, cache, apiToken, fetch, logger, graphQLEndpoint, }) => {

    let subscribedKeys = [];

    if (!role) {
        logger.error('Please initiate the redis content client with the init(redisUrl) function');
    }

    if (!redisClient) {
        logger.error('Please initiate the redis content client with the init(redisUrl) function');
    }

    const getChannelKey = (siteId, key) => {
        const channel = `content-updated:${role}:${siteId}:${key}`;
        return channel;
    };

    redisClient.on('message', (channel, message) => {
        const callback = subscribedKeys[channel];
        logger.verbose(`Incoming content for ${channel}`);
        if (callback) {
            try {
                logger.verbose(`Incoming content for ${channel}`);
                const data = JSON.parse(message);
                callback(data);
            } catch (err) {
                logger.error('Error when parsing data after redis message', err, message);
            }
        }
    });

    const contentSubscriber = (siteId, key, callback) => {
        const channel = getChannelKey(siteId, key);
        if (!subscribedKeys[channel]) {
            logger.verbose(`Subscribing to ${channel}`);
            subscribedKeys[channel] = callback;
            redisClient.subscribe(channel);
        }
    };

    const contentCacheGraphql = async (siteId, key, query) => {

        const client = new GraphQLClient(graphQLEndpoint, {
            headers: {
                'Authorization': 'Bearer ' + apiToken,
                'credentials': 'include', 
                'x-role': role, 
                'x-site-id': siteId, 
            }
        });

        const channel = getChannelKey(role, siteId, key);

        contentSubscriber(siteId, key, async () => {
            let result = await client.request(query);
            console.log('RESSSS', result);
            cache.set(channel, result);
        });

        let cached = cache.get(channel);
        if (cached) {
            return cached;
        }

        let result = await client.request(query);
        cache.set(channel, result);

        return result;

    };

    const contentCache = (fetch) => async (siteId, key, url) => {

        const channel = getChannelKey(role, siteId, key);

        contentSubscriber(siteId, key, async () => {
            let result = await fetch(url, {
                headers: {
                    'x-site-id': siteId,
                }
            });
            cache.set(channel, result);
        });

        let cached = cache.get(channel);
        if (cached) {
            return cached;
        }

        let result = await fetch(url, {
            headers: {
                'x-site-id': siteId,
            }
        });

        cache.set(channel, result);

        return result;

    };


    const fetchData = async (url, options) => {

        const commonOptions = {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + apiToken,
                'credentials': 'include', 
                'x-role': role, 
            }
        };

        const mergedOptions = mergeDeep(commonOptions, options);
        const fetchPromise = await nodeFetch(url, mergedOptions);
        const dataString = await fetchPromise.text();

        let data;

        try {
            data = JSON.parse(dataString);
        } catch (err) {
            logger.error('Got an error when parsing the JSON response from the request to "%s" with GET. The status code was %s and the result was:', url, fetchPromise.status, dataString);
            throw { type: 'fetch-error', status: fetchPromise.status, body: dataString, errorMessage: 'Error parsing json response' };
        }

        if (fetchPromise.ok) {
            return data;
        }

        // We dont want to show 404 errors in the log. Its too verbose
        if (fetchPromise.status !== 404) {
            logger.error('Error fetching data from "%s": ', url, fetchPromise.status, data);
        }

        throw { type: 'fetch-error', status: fetchPromise.status, body: dataString, ...data };

    };

    return {
        fetch: contentCache(fetch || fetchData),
        fetchQuery: contentCacheGraphql,
        subscribe: contentSubscriber,
    };

};

module.exports = ContentClientFactory;

