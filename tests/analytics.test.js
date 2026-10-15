// Run with: node --test   (from the repo root)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { injectGA, GA_ID } from '../build/analytics.js';

test('adds the tag right after <head>', () => {
  const out = injectGA('<!doctype html><html><head lang="en"><title>x</title></head><body></body></html>');
  assert.match(out, new RegExp(`<head lang="en">\\n<!-- Google tag[\\s\\S]*${GA_ID}[\\s\\S]*<title>x</title>`));
  assert.equal(out.split(`gtag/js?id=${GA_ID}`).length, 2);
});

test('leaves pages that already have the tag alone', () => {
  const html = `<html><head><script src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script></head></html>`;
  assert.equal(injectGA(html), html);
});

test('leaves fragments without <head> alone', () => {
  assert.equal(injectGA('<div>fragment</div>'), '<div>fragment</div>');
});
