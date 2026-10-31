'use strict';
const { test, before, after } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, collection, setDoc, getDoc, getDocs, updateDoc, deleteDoc, serverTimestamp } = require('firebase/firestore');

let env;
const ledger = (db, uid) => doc(db, 'users', uid, 'private', 'ledger');
const snapshot = (revision = 1) => ({
  schemaVersion: 1,
  revision,
  savedAt: serverTimestamp(),
  state: { version: 2, transactions: [], wallets: [] }
});
const verified = uid => env.authenticatedContext(uid, { email_verified: true }).firestore();

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-thukhr-two-accounts',
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules: fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8')
    }
  });
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'approvedUsers', 'alice'), { approved: true });
    await setDoc(doc(db, 'approvedUsers', 'bob'), { approved: true });
  });
});

after(async () => { if (env) await env.cleanup(); });

test('two verified approved accounts may create and read only their own ledger', async () => {
  const alice = verified('alice'), bob = verified('bob');
  await assertSucceeds(setDoc(ledger(alice, 'alice'), snapshot()));
  await assertSucceeds(setDoc(ledger(bob, 'bob'), snapshot()));
  await assertSucceeds(getDoc(ledger(alice, 'alice')));
  await assertSucceeds(getDoc(ledger(bob, 'bob')));
  await assertFails(getDoc(ledger(alice, 'bob')));
  await assertFails(getDoc(ledger(bob, 'alice')));
  await assertFails(setDoc(ledger(alice, 'bob'), snapshot()));
});

test('third account, anonymous user, and unverified account cannot access private ledgers', async () => {
  const third = verified('charlie');
  const guest = env.unauthenticatedContext().firestore();
  const unverified = env.authenticatedContext('alice', { email_verified: false }).firestore();
  await assertFails(setDoc(ledger(third, 'charlie'), snapshot()));
  await assertFails(getDoc(ledger(third, 'alice')));
  await assertFails(getDoc(ledger(guest, 'alice')));
  await assertFails(getDoc(ledger(unverified, 'alice')));
});

test('clients cannot add an approval, list users, or delete finance', async () => {
  const alice = verified('alice');
  await assertFails(setDoc(doc(alice, 'approvedUsers', 'charlie'), { approved: true }));
  await assertFails(getDocs(collection(alice, 'approvedUsers')));
  await assertFails(getDocs(collection(alice, 'users', 'alice', 'private')));
  await assertFails(deleteDoc(ledger(alice, 'alice')));
});

test('ledger revisions must increase by exactly one', async () => {
  const alice = verified('alice');
  await assertSucceeds(updateDoc(ledger(alice, 'alice'), {
    revision: 2, savedAt: serverTimestamp()
  }));
  await assertFails(updateDoc(ledger(alice, 'alice'), {
    revision: 2, savedAt: serverTimestamp()
  }));
  await assertFails(updateDoc(ledger(alice, 'alice'), {
    revision: 4, savedAt: serverTimestamp()
  }));
});
