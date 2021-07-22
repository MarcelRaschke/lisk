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

import { INTERNAL_EVENTS } from '../../src/constants';

describe('base/constants.js', () => {
	it('INTERNAL_EVENTS must match to the snapshot.', () => {
		expect(INTERNAL_EVENTS).toMatchSnapshot();
	});

	it('INTERNAL_EVENTS array should be immutable', () => {
		expect(() => (INTERNAL_EVENTS as any).push('test')).toThrow(TypeError);
		expect(() => (INTERNAL_EVENTS as any).pop()).toThrow(TypeError);
	});
});
