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
 *
 */
import { TransactionObject, Transaction } from '../../src/types';

export interface TransactionJSON
	extends Omit<TransactionObject, 'nonce' | 'fee' | 'minFee'> {
	nonce: string;
	fee: string;
}

export const wrapTransactionWithoutUniqueData = (
	transaction: TransactionJSON,
): Transaction => {
	return {
		...transaction,
		nonce: BigInt(transaction.nonce),
		fee: BigInt(transaction.fee),
		minFee: BigInt(100000),
		containsUniqueData: false,
		verifyAgainstOtherTransactions: () => true,
		isExpired: (time: Date) => time.getTime() < 0,
		isReady: () => true,
	};
};

export const wrapTransactionWithUniqueData = (
	transaction: TransactionJSON,
): Transaction => {
	return {
		...transaction,
		nonce: BigInt(transaction.nonce),
		fee: BigInt(transaction.fee),
		minFee: BigInt(100000),
		containsUniqueData: true,
		verifyAgainstOtherTransactions: () => true,
		isExpired: (time: Date) => time.getTime() < 0,
		isReady: () => true,
	};
};

export const wrapTransaction = (transaction: TransactionJSON): Transaction => {
	return [0, 1].includes(transaction.type as number)
		? wrapTransactionWithoutUniqueData(transaction)
		: wrapTransactionWithUniqueData(transaction);
};
