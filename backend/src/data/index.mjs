/**
 * SWADESH Data Layer Repository Factory
 * Single Source of Truth: docs/BLUEPRINT.md (Section 9)
 *
 * Selects between `dynamo.mjs` (AWS Cloud) and `memory.mjs` (Local / Testing)
 * driven by `config.DATA_STORE`.
 */

import { config } from '../config.mjs';
import * as dynamoRepo from './dynamo.mjs';
import * as memoryRepo from './memory.mjs';

/**
 * Returns the active data repository instance.
 *
 * @param {'dynamo' | 'memory'} [storeType=config.DATA_STORE]
 * @returns {typeof memoryRepo}
 */
export function getRepo(storeType = config.DATA_STORE) {
  const selected = (storeType || 'memory').trim().toLowerCase();
  if (selected === 'dynamo') {
    return dynamoRepo;
  }
  return memoryRepo;
}

export { dynamoRepo, memoryRepo };
export default getRepo;

