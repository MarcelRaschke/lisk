/*
 * Copyright © 2019 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

'use strict';

const debug = require('debug')('swagger:lisk:cache');
const modules = require('../helpers/swagger_module_registry');

module.exports = function create(fittingDef) {
	const cache = modules.getCache();
	const logger = modules.getLogger();
	const { mode } = fittingDef;
	const cacheSpecKey = fittingDef.swagger_cache_key;

	debug('create', mode);

	return function liskCache(context, next) {
		debug('exec', mode);

		// If not a swagger operation don't serve from pipeline
		if (!context.request.swagger.operation) {
			return new Error(
				'Invalid swagger operation, unable to process cache for response',
			);
		}

		// Check if cache is enabled for the endpoint in swagger.yml
		if (!!context.request.swagger.operation[cacheSpecKey] === false) {
			debug(
				`Cache not enabled for endpoint: ${context.request.swagger.operation.pathToDefinition.join(
					'.',
				)}`,
			);
			return next(null, context.input);
		}

		// If cache component is not loaded or cache server not ready move forward without any processing
		if (typeof cache === 'undefined' || !cache.isReady()) {
			debug('Cache module not ready');
			return next(null, context.input);
		}

		const cacheKey = context.request.originalUrl;

		// If cache fitting is called before response processing
		if (mode === 'pre_response') {
			return cache
				.getJsonForKey(cacheKey)
				.then(cachedValue => {
					if (cachedValue) {
						logger.trace(
							'Cache - Sending cached response for url:',
							context.request.url,
						);
						return context.response.json(cachedValue);
					}
					return next(null, context.input);
				})
				.catch(getJsonForKeyErr => {
					logger.trace(getJsonForKeyErr.message);
					return next(null, context.input);
				});
		}

		// If cache fitting is called after response processing
		if (mode === 'post_response') {
			if (context.statusCode === 200 || context.response.statusCode === 200) {
				logger.trace(
					'Cache - Setting response cache for url:',
					context.request.url,
				);
				return cache
					.setJsonForKey(cacheKey, context.input)
					.then(() => next(null, context.input))
					.catch(error => {
						logger.trace(error.message);
						return next(null, context.input);
					});
			}
			return next(null, context.input);
		}

		return next(`The cache mode ${mode} is not possible`);
	};
};