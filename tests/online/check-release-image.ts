import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { Client } from 'pg';

const image = process.env.QUIZMON_RELEASE_IMAGE;
assert.ok(
  image,
  'Set QUIZMON_RELEASE_IMAGE to the locally built release image.',
);
const docker = (...args: string[]) =>
  execFileSync('docker', args, { encoding: 'utf8', timeout: 120_000 });
assert.equal(
  docker('context', 'inspect', '--format', '{{.Endpoints.docker.Host}}').trim(),
  'unix:///var/run/docker.sock',
);
const isolated = [
  'run',
  '--rm',
  '--read-only',
  '--cap-drop',
  'ALL',
  '--security-opt',
  'no-new-privileges',
  '--tmpfs',
  '/tmp',
  '--tmpfs',
  '/home/node/.config',
  '--entrypoint',
  'node',
];
const artifactCheck = `
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFile, writeFile, access} from 'node:fs/promises';
const cli = (args) => execFileSync(process.execPath, ['deploy/release-command.ts', ...args], {encoding:'utf8',stdio:'pipe'});
const manifest = JSON.parse(await readFile('manifest.json','utf8'));
assert.notEqual(process.getuid(), 0);
cli(['verify','.']);
const { runReleaseProcess } = await import('./deploy/release-process.ts');
await runReleaseProcess({ command:process.execPath, args:['node_modules/wrangler/wrangler-dist/cli.js','--help'], cwd:process.cwd(), env:{WRANGLER_SEND_METRICS:'false'}, signal:new AbortController().signal, timeoutMs:30000 });
for (const name of ['a','b']) {
  const config = { version:1, workerName:'quizmon-image-'+name, origin:'https://game-'+name+'.example.test',
    sync:{version:1,endpoint:'https://sync-'+name+'.example.test',audience:'quizmon-'+name},
    hyperdriveId:(name==='a'?'1':'2').repeat(32),mailFrom:'signin@example.test',analyticsDataset:'quizmon_'+name,
    authRateLimitNamespace:'2011',apiRateLimitNamespace:'2012' };
  await writeFile('/tmp/config-'+name+'.json',JSON.stringify(config));
  cli(['prepare','.', '/tmp/config-'+name+'.json','/tmp/prepared-'+name]);
  const prepared = '/tmp/prepared-'+name;
  assert.deepEqual(await readFile(prepared+'/worker/index.js'),await readFile('worker/index.js'));
  for(const file of Object.keys(manifest.files).filter(file=>file.startsWith('assets/') && file!=='assets/_headers'))
    assert.deepEqual(await readFile(prepared+'/'+file),await readFile(file));
  const auth=JSON.parse(await readFile(prepared+'/sync-auth.json','utf8'));
  assert.equal(auth.client_auth.jwks_uri, config.origin+'/api/auth/jwks');
  assert.deepEqual(auth.client_auth.audience,[config.sync.audience]);
  const headers=await readFile(prepared+'/assets/_headers','utf8');
  assert.ok(headers.includes(config.sync.endpoint));
  assert.ok(headers.includes('wss://sync-'+name+'.example.test'));
  assert.ok(headers.includes('upgrade-insecure-requests'));
  await writeFile('/tmp/secrets.json',JSON.stringify({BETTER_AUTH_SECRET:crypto.randomUUID()+crypto.randomUUID(), VAPID_PRIVATE_KEY:'local-dry-run-only'}));
  execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','deploy','--config',prepared+'/wrangler.json','--dry-run','--outdir','/tmp/dry-'+name,'--secrets-file','/tmp/secrets.json'], {stdio:'pipe',timeout:60000});
  assert.deepEqual(await readFile('/tmp/dry-'+name+'/index.js'),await readFile('worker/index.js'));
}
await writeFile('/tmp/invalid.json',JSON.stringify({version:1}));
assert.throws(()=>cli(['prepare','.', '/tmp/invalid.json','/tmp/invalid-output']));
await assert.rejects(access('/tmp/invalid-output'));
cli(['verify','.']);
console.log('Image passed: non-root, read-only, no network or repository mount; two runtime configurations; unchanged Worker/assets; prebuilt dry runs; invalid input rejected before output.');
`;
console.log(
  docker(
    ...isolated,
    '--network',
    'none',
    image,
    '--input-type=module',
    '--eval',
    artifactCheck,
  ),
);
const database = 'quizmon_image_' + crypto.randomUUID().replaceAll('-', '');
const admin = new Client({
  connectionString: 'postgresql://postgres:unused@127.0.0.1:5548/postgres',
});
await admin.connect();
try {
  await admin.query('CREATE DATABASE ' + database);
  const migrationCheck = `
import assert from 'node:assert/strict';
import {migrateDatabase} from './deploy/migration-runner.ts';
import {publishPlayerTables} from './deploy/publication.ts';
import {coordinateRelease} from './deploy/release-coordinator.ts';
import {verifyArtifact} from './deploy/release-artifact.ts';
const manifest=await verifyArtifact('.');
const options={connectionString:process.env.QUIZMON_TEST_DATABASE,migrationsFolder:'server/migrations',configure:publishPlayerTables};
assert.deepEqual(await migrateDatabase(options),{applied:manifest.migrations.length,total:manifest.migrations.length});
assert.deepEqual(await migrateDatabase(options),{applied:0,total:manifest.migrations.length});
let activations=0;
const release={connection:{connectionString:options.connectionString},migrationsFolder:options.migrationsFolder,
  operation:{version:1,id:crypto.randomUUID(),artifact:'sha256:'+'1'.repeat(64),configuration:'sha256:'+'2'.repeat(64)},
  preflight:async()=>{},assertSelected:async()=>{},configure:publishPlayerTables,
  activate:async()=>{activations++;return{versionId:crypto.randomUUID(),deploymentId:crypto.randomUUID()};},verifyDeployment:async()=>{}};
assert.equal((await coordinateRelease(release)).status,'activated');
assert.equal((await coordinateRelease(release)).status,'verified-existing');
assert.equal(activations,1);
console.log('Image migrations and coordinator passed against real PostgreSQL, including publication, repeated migration execution, and duplicate activation prevention with an injected deployment adapter.');
`;
  console.log(
    docker(
      ...isolated,
      '--network',
      'host',
      '-e',
      `QUIZMON_TEST_DATABASE=postgresql://postgres:unused@127.0.0.1:5548/${database}`,
      image,
      '--input-type=module',
      '--eval',
      migrationCheck,
    ),
  );
} finally {
  await admin.query('DROP DATABASE IF EXISTS ' + database + ' WITH (FORCE)');
  await admin.end();
}
