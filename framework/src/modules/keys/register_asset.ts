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
import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import { objects as objectUtils } from '@liskhq/lisk-utils';
import { BaseAsset } from '../base_asset';
import { ApplyAssetContext, StateStore, ValidateAssetContext } from '../../types';
import { keysSchema } from './schemas';
import { AccountKeys } from './types';

export interface Asset {
	mandatoryKeys: Array<Readonly<Buffer>>;
	optionalKeys: Array<Readonly<Buffer>>;
	readonly numberOfSignatures: number;
}

const setMemberAccounts = async (
	store: StateStore,
	membersPublicKeys: Array<Readonly<Buffer>>,
): Promise<void> => {
	for (const memberPublicKey of membersPublicKeys) {
		const address = getAddressFromPublicKey(memberPublicKey as Buffer);
		// Key might not exists in the blockchain yet so we fetch or default
		const memberAccount = await store.account.getOrDefault(address);
		await store.account.set(memberAccount.address, memberAccount);
	}
};

export const RegisterAssetID = 0;
export const MAX_KEYS_COUNT = 64;

export class RegisterAsset extends BaseAsset {
	public name = 'registerMultisignatureGroup';
	public id = RegisterAssetID;
	public schema = keysSchema;

	public validate({ asset, transaction }: ValidateAssetContext<Asset>): void {
		const { mandatoryKeys, optionalKeys, numberOfSignatures } = asset;

		if (!objectUtils.bufferArrayUniqueItems(mandatoryKeys as Buffer[])) {
			throw new Error('MandatoryKeys contains duplicate public keys.');
		}

		if (!objectUtils.bufferArrayUniqueItems(optionalKeys as Buffer[])) {
			throw new Error('OptionalKeys contains duplicate public keys.');
		}

		// Check if key count is less than number of required signatures
		if (mandatoryKeys.length + optionalKeys.length < numberOfSignatures) {
			throw new Error(
				'The numberOfSignatures is bigger than the count of Mandatory and Optional keys.',
			);
		}

		// Check if key count is out of bounds
		if (
			mandatoryKeys.length + optionalKeys.length > MAX_KEYS_COUNT ||
			mandatoryKeys.length + optionalKeys.length <= 0
		) {
			throw new Error('The count of Mandatory and Optional keys should be between 1 and 64.');
		}

		// The numberOfSignatures needs to be equal or bigger than number of mandatoryKeys
		if (mandatoryKeys.length > numberOfSignatures) {
			throw new Error(
				'The numberOfSignatures needs to be equal or bigger than the number of Mandatory keys.',
			);
		}

		// Check if keys are repeated between mandatory and optional key sets
		const repeatedKeys = mandatoryKeys.filter(
			value => optionalKeys.find(optional => optional.equals(value as Buffer)) !== undefined,
		);
		if (repeatedKeys.length > 0) {
			throw new Error(
				'Invalid combination of Mandatory and Optional keys. Repeated keys across Mandatory and Optional were found.',
			);
		}

		// Check if the length of mandatory, optional and sender keys matches the length of signatures
		if (mandatoryKeys.length + optionalKeys.length + 1 !== transaction.signatures.length) {
			throw new Error(
				'The number of mandatory, optional and sender keys should match the number of signatures',
			);
		}

		// Check keys are sorted lexicographically
		const sortedMandatoryKeys = [...mandatoryKeys].sort((a, b) => a.compare(b as Buffer));
		const sortedOptionalKeys = [...optionalKeys].sort((a, b) => a.compare(b as Buffer));
		for (let i = 0; i < sortedMandatoryKeys.length; i += 1) {
			if (!mandatoryKeys[i].equals(sortedMandatoryKeys[i] as Buffer)) {
				throw new Error('Mandatory keys should be sorted lexicographically.');
			}
		}

		for (let i = 0; i < sortedOptionalKeys.length; i += 1) {
			if (!optionalKeys[i].equals(sortedOptionalKeys[i] as Buffer)) {
				throw new Error('Optional keys should be sorted lexicographically.');
			}
		}
	}

	public async apply({ asset, stateStore, transaction }: ApplyAssetContext<Asset>): Promise<void> {
		const sender = await stateStore.account.get<AccountKeys>(transaction.senderAddress);

		// Check if multisignatures already exists on account
		if (sender.keys.numberOfSignatures > 0) {
			throw new Error('Register multisignature only allowed once per account.');
		}

		sender.keys = {
			numberOfSignatures: asset.numberOfSignatures,
			mandatoryKeys: asset.mandatoryKeys as Buffer[],
			optionalKeys: asset.optionalKeys as Buffer[],
		};

		await stateStore.account.set<AccountKeys>(sender.address, sender);

		// Cache all members public keys
		await setMemberAccounts(stateStore, sender.keys.mandatoryKeys);
		await setMemberAccounts(stateStore, sender.keys.optionalKeys);
	}
}
