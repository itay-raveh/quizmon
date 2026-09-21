import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

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
