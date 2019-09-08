const redis = require('redis');
const LRU = require('lru-cache');
const contentClientFactory = require('./content-client-factory');

const simpleLogger = {
    info: console.log,
    error: console.error,
    verbose: console.log,
    debug: console.log,
};

const create = ({ redisUrl, role, apiToken, logger = simpleLogger}) => {

    const redisClient = redis.createClient(redisUrl);
    const cache = new LRU({ max: 500, maxAge: 1000 * 60 * 60, });

    redisClient.on('error', (err) => {
        logger.error(err);
    });

    redisClient.on('connect', () =>{
        logger.info(`RAWB Content Cache connected to ${redisUrl} for "${role}"`);
    });

    return contentClientFactory({
        redisClient,
        role,
        cache,
        logger,
        apiToken,
    });

};

module.exports = create;
