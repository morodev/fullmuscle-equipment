import { readFile, writeFile, copyFile } from 'node:fs/promises';
const root = 'data/catalog-branding/generated/free-weight-batch-01';
const queue = JSON.parse(await readFile('data/catalog-branding/jobs.json', 'utf8'));
const jobs = queue.jobs.filter(job => job.categoryId === 'free-weight' && job.status === 'pending').map(job => ({...job, outputPath: `${root}/${job.assetId}.png`, promptPath: `${root}/${job.assetId}.prompt.json`, status: 'pending', QA: null}));
if(jobs.length !== 47) throw new Error(`Expected 47 jobs, found ${jobs.length}`);
await writeFile(`${root}/review.json`, JSON.stringify({schemaVersion: 1, tool: 'image_gen.imagegen', referenceGreen: '#356B35', jobs}, null, 2) + '\n');
await copyFile('data/catalog-branding/generated/gt-batch-01/record.mjs',`${root}/record.mjs`);
console.log(JSON.stringify(jobs));
