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

export const delegatesUserNamesSchema = {
	$id: '/dpos/userNames',
	type: 'object',
	properties: {
		registeredDelegates: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				required: ['username', 'address'],
				properties: {
					username: {
						dataType: 'string',
						fieldNumber: 1,
					},
					address: {
						dataType: 'bytes',
						fieldNumber: 2,
					},
				},
			},
		},
	},
	required: ['registeredDelegates'],
};

export const dposModuleParamsSchema = {
	$id: '/dpos/params',
	type: 'object',
	required: ['activeDelegates', 'standbyDelegates', 'delegateListRoundOffset'],
	additionalProperties: true,
	properties: {
		activeDelegates: {
			dataType: 'uint32',
		},
		standbyDelegates: {
			dataType: 'uint32',
		},
		delegateListRoundOffset: {
			dataType: 'uint32',
		},
	},
};

export const dposAccountSchema = {
	type: 'object',
	properties: {
		delegate: {
			type: 'object',
			fieldNumber: 1,
			properties: {
				username: { dataType: 'string', fieldNumber: 1 },
				pomHeights: {
					type: 'array',
					items: { dataType: 'uint32' },
					fieldNumber: 2,
				},
				consecutiveMissedBlocks: { dataType: 'uint32', fieldNumber: 3 },
				lastForgedHeight: { dataType: 'uint32', fieldNumber: 4 },
				isBanned: { dataType: 'boolean', fieldNumber: 5 },
				totalVotesReceived: { dataType: 'uint64', fieldNumber: 6 },
			},
			required: [
				'username',
				'pomHeights',
				'consecutiveMissedBlocks',
				'lastForgedHeight',
				'isBanned',
				'totalVotesReceived',
			],
		},
		sentVotes: {
			type: 'array',
			fieldNumber: 2,
			items: {
				type: 'object',
				properties: {
					delegateAddress: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					amount: {
						dataType: 'uint64',
						fieldNumber: 2,
					},
				},
				required: ['delegateAddress', 'amount'],
			},
		},
		unlocking: {
			type: 'array',
			fieldNumber: 3,
			items: {
				type: 'object',
				properties: {
					delegateAddress: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					amount: {
						dataType: 'uint64',
						fieldNumber: 2,
					},
					unvoteHeight: {
						dataType: 'uint32',
						fieldNumber: 3,
					},
				},
				required: ['delegateAddress', 'amount', 'unvoteHeight'],
			},
		},
	},
	default: {
		delegate: {
			username: '',
			pomHeights: [],
			consecutiveMissedBlocks: 0,
			lastForgedHeight: 0,
			isBanned: false,
			totalVotesReceived: BigInt(0),
		},
		sentVotes: [],
		unlocking: [],
	},
};

export const voteWeightsSchema = {
	$id: '/dpos/voteWeights',
	type: 'object',
	properties: {
		voteWeights: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				properties: {
					round: {
						dataType: 'uint32',
						fieldNumber: 1,
					},
					delegates: {
						type: 'array',
						fieldNumber: 2,
						items: {
							type: 'object',
							properties: {
								address: {
									dataType: 'bytes',
									fieldNumber: 1,
								},
								voteWeight: {
									dataType: 'uint64',
									fieldNumber: 2,
								},
							},
						},
					},
				},
			},
		},
	},
	required: ['voteWeights'],
};
