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
/* eslint-disable class-methods-use-this */
import { MAX_TRANSACTION_AMOUNT } from './constants';
import { TokenAccount, Asset } from './types';
import { BaseAsset } from '../base_asset';
import { ApplyAssetContext } from '../../types';

export class TransferAsset extends BaseAsset {
	public name = 'transfer';
	public id = 0;
	public schema = {
		$id: 'lisk/transfer-asset',
		title: 'Transfer transaction asset',
		type: 'object',
		required: ['amount', 'recipientAddress', 'data'],
		properties: {
			amount: {
				dataType: 'uint64',
				fieldNumber: 1,
			},
			recipientAddress: {
				dataType: 'bytes',
				fieldNumber: 2,
				minLength: 20,
				maxLength: 20,
			},
			data: {
				dataType: 'string',
				fieldNumber: 3,
				minLength: 0,
				maxLength: 64,
			},
		},
	};
	private readonly _minRemainingBalance: bigint;

	public constructor(minRemainingBalance: bigint) {
		super();
		this._minRemainingBalance = minRemainingBalance;
	}

	public async apply({ asset, transaction, stateStore }: ApplyAssetContext<Asset>): Promise<void> {
		const sender = await stateStore.account.get<TokenAccount>(transaction.senderAddress);
		if (!sender) {
			throw new Error(
				`Account does not exist for senderAddress: ${transaction.senderAddress.toString('hex')}`,
			);
		}
		sender.token.balance -= asset.amount;
		await stateStore.account.set(sender.address, sender);
		const recipient = await stateStore.account.getOrDefault<TokenAccount>(asset.recipientAddress);
		recipient.token.balance += asset.amount;
		if (recipient.token.balance > BigInt(MAX_TRANSACTION_AMOUNT)) {
			throw new Error(
				`Invalid transfer amount: ${asset.amount.toString()}. Maximum allowed balance for recipient is: ${MAX_TRANSACTION_AMOUNT}`,
			);
		}

		if (recipient.token.balance < this._minRemainingBalance) {
			throw new Error(
				`Recipient account ${recipient.address.toString(
					'hex',
				)} does not meet the minimum remaining balance requirement: ${this._minRemainingBalance}.`,
			);
		}

		await stateStore.account.set(recipient.address, recipient);
	}
}
