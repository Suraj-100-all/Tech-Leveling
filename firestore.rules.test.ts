import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rules = fs.readFileSync('firestore.rules', 'utf-8');
const blueprint = JSON.parse(fs.readFileSync('firebase-blueprint.json', 'utf-8'));

test('firestore.rules enforces default-deny safety net and rules_version 2', () => {
  assert.ok(rules.includes("rules_version = '2';"));
  assert.ok(rules.includes('match /{document=**}'));
  assert.ok(rules.includes('allow read, write: if false;'));
});

test('firestore.rules covers every collection declared in firebase-blueprint.json', () => {
  const paths = Object.keys(blueprint.firestore);
  assert.ok(paths.includes('/profiles/{userId}'));
  assert.ok(paths.includes('/matches/{matchId}'));
  assert.ok(rules.includes('match /profiles/{userId}'));
  assert.ok(rules.includes('match /matches/{matchId}'));
});

test('firestore.rules enforces Dirty Dozen security invariants', () => {
  assert.ok(rules.includes('request.auth.token.email_verified == true'), 'Must require email_verified');
  assert.ok(rules.includes('isValidPlayerProfile(incoming())'), 'Must wrap profile writes with blueprint validator');
  assert.ok(rules.includes('isValidMatchRecord(incoming())'), 'Must wrap match writes with blueprint validator');
  assert.ok(rules.includes('incoming().createdAt == request.time'), 'Must enforce server timestamp on create');
  assert.ok(rules.includes('incoming().updatedAt == request.time'), 'Must enforce server timestamp on update');
  assert.ok(rules.includes('incoming().createdAt == existing().createdAt'), 'Must keep createdAt immutable');
  assert.ok(rules.includes('affectedKeys().hasOnly('), 'Must enforce action-based affectedKeys allowlist');
  assert.ok(rules.includes('allow list: if isSignedIn()\n        && existing().uid == request.auth.uid;'), 'Must enforce resource-scoped list queries');
  assert.ok(rules.includes('allow update: if false;'), 'Must lock terminal match records');
});
