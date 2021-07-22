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
import * as fixture from '../fixtures/transaction_merkle_root/transaction_merkle_root.json';
import { MerkleTree } from '../../src/merkle_tree/merkle_tree';
import { EMPTY_HASH } from '../../src/merkle_tree/constants';
import { verifyProof } from '../../src/merkle_tree/verify_proof';
import { InMemoryDB } from '../../src/inmemory_db';

describe('MerkleTree', () => {
	describe('constructor', () => {
		for (const test of fixture.testCases) {
			// eslint-disable-next-line jest/valid-title
			describe(test.description, () => {
				it('should result in correct merkle root', async () => {
					const inputs = test.input.transactionIds.map(hexString => Buffer.from(hexString, 'hex'));
					const merkleTree = new MerkleTree();
					await merkleTree.init(inputs);

					expect(merkleTree.root).toEqual(Buffer.from(test.output.transactionMerkleRoot, 'hex'));
				});

				describe('should allow pre-hashed leafs', () => {
					if (test.input.transactionIds.length > 2 ** 2) {
						it('should result in same merkle root if divided into sub tree of power of 2', async () => {
							const inputs = test.input.transactionIds.map(hexString =>
								Buffer.from(hexString, 'hex'),
							);
							const subTreeRoots = [];

							const chunk = 2 ** 2;
							for (let i = 0; i < inputs.length; i += chunk) {
								const tree = new MerkleTree();
								await tree.init(inputs.slice(i, i + chunk));
								subTreeRoots.push(tree.root);
							}

							const expectedTree = new MerkleTree({ preHashedLeaf: true });
							await expectedTree.init(subTreeRoots);

							expect(expectedTree.root).toEqual(
								Buffer.from(test.output.transactionMerkleRoot, 'hex'),
							);
						});

						it('should not result in same merkle root if divided into sub tree which is not power of 2', async () => {
							const inputs = test.input.transactionIds.map(hexString =>
								Buffer.from(hexString, 'hex'),
							);
							const subTreeRoots = [];

							const chunk = 3;
							for (let i = 0; i < inputs.length; i += chunk) {
								const tree = new MerkleTree();
								await tree.init(inputs.slice(i, i + chunk));
								subTreeRoots.push(tree.root);
							}

							const expectedTree = new MerkleTree({ preHashedLeaf: true });
							await expectedTree.init(subTreeRoots);

							expect(expectedTree.root).not.toEqual(
								Buffer.from(test.output.transactionMerkleRoot, 'hex'),
							);
						});
					}
				});
			});
		}
	});

	describe('append', () => {
		for (const test of fixture.testCases.slice(1)) {
			// eslint-disable-next-line jest/valid-title
			describe(test.description, () => {
				it('should append and have correct root', async () => {
					const inputs = test.input.transactionIds.map(hexString => Buffer.from(hexString, 'hex'));
					const toAppend = inputs.pop();
					const merkleTree = new MerkleTree();
					await merkleTree.init(inputs);
					await merkleTree.append(toAppend as Buffer);
					expect(merkleTree.root).toEqual(Buffer.from(test.output.transactionMerkleRoot, 'hex'));
				});
			});
		}
	});

	describe('generateProof and verifyProof', () => {
		for (const test of fixture.testCases) {
			// eslint-disable-next-line jest/valid-title
			describe(test.description, () => {
				it('should generate and verify correct proof', async () => {
					const inputs = test.input.transactionIds.map(hexString => Buffer.from(hexString, 'hex'));
					const merkleTree = new MerkleTree();
					await merkleTree.init(inputs);
					const nodes =
						merkleTree.size !== 0
							? await Promise.all(
									Object.keys((merkleTree['_db'] as InMemoryDB)['_data'])
										.filter(key => Buffer.from(key, 'binary')[0] === 0)
										.map(async key => merkleTree.getNode(Buffer.from(key, 'binary').slice(1))),
							  )
							: [];
					const queryData = nodes
						.sort(() => 0.5 - Math.random())
						.slice(0, Math.floor(Math.random() * nodes.length + 1))
						.map((node: any) => node.hash);
					const proof = await merkleTree.generateProof(queryData);
					const results = await verifyProof({
						queryData,
						proof,
						rootHash: merkleTree.root,
					});

					expect(results.every(result => result.verified)).toBeTrue();
				});

				it('should generate and verify invalid proof', async () => {
					const inputs = test.input.transactionIds.map(hexString => Buffer.from(hexString, 'hex'));
					const merkleTree = new MerkleTree();
					await merkleTree.init(inputs);
					const nodes =
						merkleTree.size !== 0
							? await Promise.all(
									Object.keys((merkleTree['_db'] as InMemoryDB)['_data'])
										.filter(key => Buffer.from(key, 'binary')[0] === 0)
										.map(async key => merkleTree.getNode(Buffer.from(key, 'binary').slice(1))),
							  )
							: [];
					const randomizedQueryCount = Math.floor(Math.random() * nodes.length + 1);
					const invalidNodeIndex =
						inputs.length > 0 ? Math.floor(Math.random() * randomizedQueryCount + 1) : 0;
					const queryData =
						inputs.length > 0
							? nodes
									.sort(() => 0.5 - Math.random())
									.slice(0, randomizedQueryCount)
									.map((node: any) => node.hash)
							: [];
					queryData.splice(invalidNodeIndex, 1, EMPTY_HASH);
					const proof = await merkleTree.generateProof(queryData);
					const results = await verifyProof({
						queryData,
						proof,
						rootHash: merkleTree.root,
					});

					// If 0 tree, proof is always valid
					if (inputs.length === 0) {
						return expect(results.every(result => result.verified)).toBeTrue();
					}

					expect(
						results.filter((_, i) => i !== invalidNodeIndex).every(result => result.verified),
					).toBeTrue();
					return expect(results[invalidNodeIndex].verified).toBeFalse();
				});
			});
		}
	});
});
