import assert from 'node:assert/strict';
import test from 'node:test';
import {expectedScenes, sceneAssetIssues, sceneUsageIssues} from './validation.mjs';

const assets = expectedScenes.map(scene => ({
  id: scene.id, source: scene.source, prepared: scene.prepared,
  sourceHash: 'a'.repeat(64), preparedHash: 'b'.repeat(64), width: 1536, height: 1024,
}));
const usages = expectedScenes.map(scene => ({
  id: scene.id, page: scene.page, productSku: scene.productSku, placement: scene.placement,
  src: scene.prepared.replace('layout/', ''), caption: scene.caption,
  widthMm: scene.widthMm, heightMm: scene.heightMm, objectFit: 'contain',
  belowPrice: scene.placement === 'training', loaded: true, ppi: 240,
  sourceHash: 'a'.repeat(64), preparedHash: 'b'.repeat(64),
}));

test('scene assets and their correct uncropped uses at 240 ppi pass independently of product photos', () => {
  assert.deepEqual(sceneAssetIssues(assets), []);
  assert.deepEqual(sceneUsageIssues(usages, assets), []);
});

test('missing scenes, duplicate usages and swapped training pages cannot pass preflight', () => {
  assert.ok(sceneAssetIssues(undefined).length);
  assert.ok(sceneAssetIssues(assets.slice(0, 2)).some(issue => issue.includes('lat-training')));
  assert.ok(sceneUsageIssues([usages[0], usages[1], usages[1]], assets).some(issue => issue.includes('duplicate')));
  const swapped = structuredClone(usages);
  [swapped[1].page, swapped[2].page] = [swapped[2].page, swapped[1].page];
  assert.equal(sceneUsageIssues(swapped, assets).filter(issue => issue.includes('placement')).length, 2);
});

test('cropping, price overlap, insufficient resolution and changed source association reject a scene', () => {
  for (const [change, expected] of [
    [{objectFit: 'cover'}, /cropping/],
    [{belowPrice: false}, /below the price/],
    [{ppi: 239.99}, /resolution/],
    [{loaded: false}, /resolution/],
    [{heightMm: 31}, /box/],
    [{caption: ''}, /caption/],
    [{sourceHash: 'c'.repeat(64)}, /verified input/],
  ]) {
    const changed = structuredClone(usages);
    Object.assign(changed[1], change);
    assert.match(sceneUsageIssues(changed, assets).join('\n'), expected);
  }
});
