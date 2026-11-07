import { readFile, writeFile } from 'node:fs/promises';
const root = 'data/catalog-branding/generated/x6-batch-02';
const queue = JSON.parse(await readFile('data/catalog-branding/jobs.json', 'utf8'));
const first = JSON.parse(await readFile('data/catalog-branding/generated/x6-batch-01/review.json', 'utf8'));
const excluded = new Set(first.jobs.map(job => job.assetId));
const jobs = queue.jobs.filter(job => job.lineId === 'fm-x6-series' && !excluded.has(job.assetId) && !['FM-X6005','FM-X6053'].includes(job.sku)).map(job => ({...job, outputPath: `${root}/${job.assetId}.png`, promptPath: `${root}/${job.assetId}.prompt.json`, status: 'pending', QA: null}));
if(jobs.length !== 17) throw new Error(`Expected 17 jobs, found ${jobs.length}`);
await writeFile(`${root}/review.json`, JSON.stringify({schemaVersion: 1, tool: 'image_gen.imagegen', referenceGreen: '#356B35', jobs}, null, 2) + '\n');
console.log(JSON.stringify(jobs));
