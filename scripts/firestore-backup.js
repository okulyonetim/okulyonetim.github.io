#!/usr/bin/env node
'use strict';

/**
 * Koruk Asistan Firestore logical backup.
 * Reads Firestore with the Firebase service account and writes a dated, compressed JSON archive to a
 * private Supabase Storage bucket (Firebase Storage is no longer used).
 * Required environment:
 *   FIREBASE_SERVICE_ACCOUNT      Firebase service account JSON (read access to Firestore)
 *   SUPABASE_URL                  e.g. https://xxxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY     Supabase secret key (never exposed to the app)
 *   SUPABASE_BUCKET               Private bucket name (default: okul_dosyalar)
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
  const url = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error('SUPABASE_URL is required.');
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY secret is required.');
  admin.initializeApp({ credential, projectId });
  return { db: admin.firestore(), store: supabaseStore(url, key, process.env.SUPABASE_BUCKET || 'okul_dosyalar'), projectId };
}

function supabaseStore(url, key, bucket) {
  const headers = extra => ({ Authorization: `Bearer ${key}`, apikey: key, ...extra });
  const base = `${url}/storage/v1/object`;
  const enc = name => name.split('/').map(encodeURIComponent).join('/');
  async function check(res, what) {
    if (res.ok) return res;
    throw new Error(`Supabase ${what} failed: HTTP ${res.status} ${(await res.text().catch(() => '')).slice(0, 300)}`);
  }
  return {
    async save(name, bytes) {
      await check(await fetch(`${base}/${bucket}/${enc(name)}`, { method: 'POST', headers: headers({ 'Content-Type': 'application/gzip', 'x-upsert': 'true' }), body: bytes }), 'upload');
      // Integrity check: read the object back and compare size and checksum.
      const back = await check(await fetch(`${base}/authenticated/${bucket}/${enc(name)}`, { headers: headers() }), 'verify download');
      const got = Buffer.from(await back.arrayBuffer());
      if (got.length !== bytes.length || !got.equals(bytes)) throw new Error(`Backup verification failed: uploaded ${bytes.length} bytes, read back ${got.length}.`);
    },
    async list(prefix) {
      const res = await check(await fetch(`${url}/storage/v1/object/list/${bucket}`, { method: 'POST', headers: headers({ 'Content-Type': 'application/json' }), body: JSON.stringify({ prefix, limit: 1000, offset: 0, sortBy: { column: 'created_at', order: 'asc' } }) }), 'list');
      return (await res.json()).filter(x => x && x.name && x.id);
    },
    async remove(names) {
      if (!names.length) return;
      await check(await fetch(`${base}/${bucket}`, { method: 'DELETE', headers: headers({ 'Content-Type': 'application/json' }), body: JSON.stringify({ prefixes: names }) }), 'delete');
    }
  };
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
  const { db, store, projectId } = init();
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
  await store.save(objectName, compressed);
  console.log(JSON.stringify({ ok: true, objectName, documentCount: records.length, collectionCount: collections.length, bytes: compressed.length }));

  // Retain dated backups for the configured number of days.
  const prefix = 'koruk-asistan/firestore';
  const files = await store.list(prefix);
  const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const old = files.filter(f => `${prefix}/${f.name}` !== objectName && Date.parse(f.created_at || '') < cutoff).map(f => `${prefix}/${f.name}`);
  await store.remove(old);
  console.log(JSON.stringify({ retentionDays: RETENTION_DAYS, deletedOldBackups: old.length }));
  await admin.app().delete();
}

main().catch(async error => {
  console.error('[KorukBackup] FAILED:', error?.stack || error?.message || error);
  try { await admin.app().delete(); } catch (_) {}
  process.exitCode = 1;
});
