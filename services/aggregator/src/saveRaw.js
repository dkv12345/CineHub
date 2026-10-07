import { createHash } from 'node:crypto';
import { MongoClient } from 'mongodb';
import { mongoUri } from './config.js';

export async function openRaw() {
  const client = new MongoClient(mongoUri);
  await client.connect();
  const col = client.db().collection('crawl_raw_items');
  await col.createIndex({ source: 1, kind: 1, externalId: 1, contentHash: 1 }, { unique: true });
  await col.createIndex({ fetchedAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });
  return { client, col };
}

export async function saveRaw(col, kind, items, idOf) {
  if (!items.length) return;
  const ops = items.map((it) => {
    const contentHash = createHash('sha1').update(JSON.stringify(it)).digest('hex');
    return {
      updateOne: {
        filter: { source: 'GALAXY', kind, externalId: idOf(it), contentHash },
        update: { $setOnInsert: { payload: it, fetchedAt: new Date() } },
        upsert: true,
      },
    };
  });
  await col.bulkWrite(ops, { ordered: false });
}
