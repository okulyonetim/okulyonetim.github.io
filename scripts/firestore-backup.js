#!/usr/bin/env node
'use strict';

/**
 * Koruk Asistan Firestore logical backup.
 * Writes a dated, compressed JSON archive to a private Google Cloud Storage bucket.
 * Required environment:
 *   FIREBASE_SERVICE_ACCOUNT  Service account JSON
 *   FIREBASE_STORAGE_BUCKET   Private bucket name, e.g. the Firebase Storage bucket
 */
const admin = require('firebase-admin');
const { gzipSync } = require('node:zlib');

const RETENTION_DAYS = Math.max(7, Number(process.env.BACKUP_RETENTION_DAYS) || 30);
const PAGE_SIZE = 400;

function init() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT secret is required.');
  const credential = admin.credential.cert(JSON.parse(raw));
  const projectId = JSON.parse(raw).project_id;
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
  if (!bucketName) throw new Error('FIREBASE_STORAGE_BUCKET secret is required.');
  admin.initializeApp({ credential, projectId, storageBucket: bucketName });
  return { db: admin.firestore(), bucket: admin.storage().bucket(bucketName), projectId };
}

function encode(value) {
  if (value === null || value === undefined) return value === undefined ? null : value;
  if (value instanceof admin.firestore.Timestamp) return { __korukType: 'Timestamp', seconds: value.seconds, nanoseconds: value.nanoseconds };
  if (value instanceof admin.firestore.GeoPoint) return { __korukType: 'GeoPoint', latitude: value.latitude, longitude: value.longitude };
  if (value instanceof admin.firestore.DocumentReference) return { __korukType: 'DocumentReference', path: value.path };
  if (Buffer.isBuffer(value)) return { __korukType: 'Bytes', base64: value.toString('base64') };
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, item] of Object.entries(value)) out[key] = encode(item);
    return out;
  }
  if (typeof value === 'number' && !Number.isFinite(value)) return { __korukType: 'Number', value: String(value) };
  return value;
}

async function readCollection(db, collectionRef, records) {
  let cursor = null;
  while (true) {
    let query = collectionRef.orderBy(admin.firestore.FieldPath.documentId()).limit(PAGE_SIZE);
    if (cursor) query = query.startAfter(cursor);
    const snap = await query.get();
    if (snap.empty) break;
    for (const doc of snap.docs) {
      records.push({ path: doc.ref.path, data: encode(doc.data()), updateTime: doc.updateTime.toDate().toISOString() });
      const nested = await doc.ref.listCollections();
      for (const sub of nested) await readCollection(db, sub, records);
    }
    cursor = snap.docs[snap.docs.length - 1];
    if (snap.size < PAGE_SIZE) break;
  }
}

async function main() {
  const { db, bucket, projectId } = init();
  const started = new Date();
  const collections = await db.listCollections();
  const records = [];
  for (const collection of collections) {
    await readCollection(db, collection, records);
    console.log(`Backed up ${collection.id}`);
  }
  const payload = {
    format: 'koruk-asistan-firestore-backup',
    formatVersion: 1,
    projectId,
    createdAt: started.toISOString(),
    completedAt: new Date().toISOString(),
    documentCount: records.length,
    collectionCount: collections.length,
    records
  };
  const json = Buffer.from(JSON.stringify(payload));
  const compressed = gzipSync(json, { level: 9 });
  const stamp = started.toISOString().replace(/[:.]/g, '-');
  const objectName = `koruk-asistan/firestore/${stamp}.json.gz`;
  await bucket.file(objectName).save(compressed, {
    resumable: false,
    validation: 'crc32c',
    metadata: {
      contentType: 'application/gzip',
      contentEncoding: 'gzip',
      metadata: {
        format: payload.format,
        formatVersion: String(payload.formatVersion),
        projectId,
        createdAt: payload.createdAt,
        documentCount: String(records.length)
      }
    }
  });
  console.log(JSON.stringify({ ok: true, objectName, documentCount: records.length, collectionCount: collections.length, bytes: compressed.length }));

  // Retain dated backups for the configured number of days.
  const [files] = await bucket.getFiles({ prefix: 'koruk-asistan/firestore/' });
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  let deleted = 0;
  for (const file of files) {
    if (file.name === objectName) continue;
    const created = Date.parse(file.metadata?.timeCreated || '');
    if (Number.isFinite(created) && created < cutoff) {
      await file.delete({ ignoreNotFound: true });
      deleted++;
    }
  }
  console.log(JSON.stringify({ retentionDays: RETENTION_DAYS, deletedOldBackups: deleted }));
  await admin.app().delete();
}

main().catch(async error => {
  console.error('[KorukBackup] FAILED:', error?.stack || error?.message || error);
  try { await admin.app().delete(); } catch (_) {}
  process.exitCode = 1;
});
