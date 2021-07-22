/*
 * Copyright © 2020 Lisk Foundation
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

import { Rounds } from '../../../../src/modules/dpos/rounds';

import { DEFAULT_ACTIVE_DELEGATE } from '../../../../src/modules/dpos/constants';

describe('Slots', () => {
	let rounds: Rounds;

	beforeEach(() => {
		rounds = new Rounds({
			blocksPerRound: DEFAULT_ACTIVE_DELEGATE,
		});
	});

	describe('calc', () => {
		it('should calculate round number from given block height', () => {
			expect(rounds.calcRound(100)).toEqual(1);
			expect(rounds.calcRound(200)).toEqual(2);
			expect(rounds.calcRound(303)).toEqual(3);
			return expect(rounds.calcRound(304)).toEqual(4);
		});

		it('should calculate round number from Number.MAX_VALUE', () => {
			const res = rounds.calcRound(Number.MAX_VALUE);
			expect(typeof res === 'number').toBe(true);
			return expect(res).toBeLessThan(Number.MAX_VALUE);
		});
	});
});
