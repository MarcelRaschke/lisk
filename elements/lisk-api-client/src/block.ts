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
 *
 */
import { codec } from '@liskhq/lisk-codec';
import { Block as BlockType, Channel, RegisteredSchemas } from './types';
import { decodeBlock, encodeBlock, getTransactionAssetSchema } from './codec';

export class Block {
	private readonly _channel: Channel;
	private readonly _schemas: RegisteredSchemas;

	public constructor(channel: Channel, registeredSchema: RegisteredSchemas) {
		this._channel = channel;
		this._schemas = registeredSchema;
	}

	public async get(id: Buffer | string): Promise<Record<string, unknown>> {
		const idString: string = Buffer.isBuffer(id) ? id.toString('hex') : id;
		const blockHex = await this._channel.invoke<string>('app:getBlockByID', {
			id: idString,
		});
		const blockBytes = Buffer.from(blockHex, 'hex');
		return decodeBlock(blockBytes, this._schemas);
	}

	public async getByHeight(height: number): Promise<Record<string, unknown>> {
		const blockHex = await this._channel.invoke<string>('app:getBlockByHeight', { height });
		const blockBytes = Buffer.from(blockHex, 'hex');
		return decodeBlock(blockBytes, this._schemas);
	}

	public encode(input: {
		header: Record<string, unknown>;
		payload: Record<string, unknown>[];
	}): Buffer {
		return encodeBlock(input, this._schemas);
	}

	public decode<T = Record<string, unknown>>(input: Buffer | string): T {
		const inputBuffer: Buffer = Buffer.isBuffer(input) ? input : Buffer.from(input, 'hex');
		return decodeBlock(inputBuffer, this._schemas) as T;
	}

	public toJSON(
		block: BlockType,
	): {
		header: Record<string, unknown>;
		payload: Record<string, unknown>[];
	} {
		const { asset, ...headerRoot } = block.header;

		// We need to do this as our schemas do not include the ID. Keep this.
		const tmpBlockId = headerRoot.id;
		delete headerRoot.id;

		// decode header
		const header = {
			...codec.toJSON(this._schemas.blockHeader, headerRoot),
			asset: {},
			id: tmpBlockId?.toString('hex'),
		};

		// decode header's asset
		const headerAssetJson = codec.toJSON(
			this._schemas.blockHeadersAssets[block.header.version],
			asset,
		);
		header.asset = headerAssetJson;

		const payload: Record<string, unknown>[] = [];

		// decode transactions
		for (const tx of block.payload) {
			const { asset: txAsset, ...txRoot } = tx;
			// We need to do this as our schemas do not include the ID. Keep this.
			const tmpId = txRoot.id;
			delete txRoot.id;

			const schemaAsset = getTransactionAssetSchema(tx, this._schemas);
			const jsonTxAsset = codec.toJSON(schemaAsset, txAsset as object);
			const jsonTxRoot = codec.toJSON(this._schemas.transaction, txRoot);

			const jsonTx = {
				...jsonTxRoot,
				id: tmpId?.toString('hex'),
				asset: jsonTxAsset,
			};

			payload.push(jsonTx);
		}

		return { header, payload };
	}

	public fromJSON(
		block: BlockType<string>,
	): {
		header: Record<string, unknown>;
		payload: Record<string, unknown>[];
	} {
		const { asset, ...headerRoot } = block.header;

		// We need to do this as our schemas do not include the ID. Keep this.
		const tmpBlockId = headerRoot.id ? Buffer.from(headerRoot.id, 'hex') : Buffer.alloc(0);
		delete headerRoot.id;

		// decode header
		const header = {
			...codec.fromJSON(this._schemas.blockHeader, headerRoot),
			asset: {},
			id: tmpBlockId,
		};

		// decode header's asset
		const headerAssetJson = codec.fromJSON(
			this._schemas.blockHeadersAssets[block.header.version],
			asset,
		);
		header.asset = headerAssetJson;

		const payload: Record<string, unknown>[] = [];
		// decode transactions
		for (const tx of block.payload) {
			const { asset: txAsset, ...txRoot } = tx;
			// We need to do this as our schemas do not include the ID. Keep this.
			const tmpId = txRoot.id ? Buffer.from(txRoot.id, 'hex') : Buffer.alloc(0);
			delete txRoot.id;

			const schemaAsset = getTransactionAssetSchema(tx, this._schemas);
			const txAssetObject = codec.fromJSON(schemaAsset, txAsset as object);
			const txRootObject = codec.fromJSON(this._schemas.transaction, txRoot);

			const txObject = {
				...txRootObject,
				id: tmpId,
				asset: txAssetObject,
			};

			payload.push(txObject);
		}

		return { header, payload };
	}
}
