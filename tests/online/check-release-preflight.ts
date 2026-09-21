import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createECDH, randomBytes } from 'node:crypto';
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const image = process.env.QUIZMON_RELEASE_IMAGE;
assert.ok(image, 'Set QUIZMON_RELEASE_IMAGE to the locally built candidate.');
const docker = (...args: string[]) =>
  execFileSync('docker', args, {
    encoding: 'utf8',
    timeout: 60_000,
    stdio: 'pipe',
  }).trim();
assert.equal(
  docker('context', 'inspect', '--format', '{{.Endpoints.docker.Host}}'),
  'unix:///var/run/docker.sock',
);
const root = fileURLToPath(
  new URL('../../.wrangler/accounts/', import.meta.url),
);
await mkdir(root, { recursive: true });
const directory = await mkdtemp(join(root, 'preflight-'));
await chmod(directory, 0o755);
const prefix = 'quizmon-preflight-' + crypto.randomUUID().slice(0, 8);
const compose = await readFile(
  new URL('../../compose.yaml', import.meta.url),
  'utf8',
);
const postgres = /image: (postgres:[^\n]+)/.exec(compose)![1]!;
const fixturePassword = randomBytes(24).toString('hex');
const curve = createECDH('prime256v1');
const publicKey = curve.generateKeys().toString('base64url');
const fixtureSecret = randomBytes(32).toString('hex');
const fixture = async (name: string, content: string) => {
  await writeFile(join(directory, name), content, { mode: 0o644 });
};
const openssl = (...args: string[]) =>
  execFileSync('openssl', args, { cwd: directory, stdio: 'pipe' });
let started = false;
let plainStarted = false;
let network = false;
try {
  openssl(
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-keyout',
    'ca.key',
    '-out',
    'ca.crt',
    '-days',
    '1',
    '-subj',
    '/CN=Quizmon local preflight CA',
  );
  openssl(
    'req',
    '-new',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-keyout',
    'server.key',
    '-out',
    'server.csr',
    '-subj',
    '/CN=db.example.test',
  );
  await fixture(
    'server.ext',
    'subjectAltName=DNS:db.example.test\nextendedKeyUsage=serverAuth\n',
  );
  openssl(
    'x509',
    '-req',
    '-in',
    'server.csr',
    '-CA',
    'ca.crt',
    '-CAkey',
    'ca.key',
    '-CAcreateserial',
    '-out',
    'server.crt',
    '-days',
    '1',
    '-extfile',
    'server.ext',
  );
  await fixture(
    'init.sql',
    `CREATE ROLE migrator LOGIN PASSWORD '${fixturePassword}';
CREATE DATABASE quizmon OWNER migrator;
GRANT CREATE ON DATABASE quizmon TO migrator;
CREATE ROLE readonly_migrator LOGIN PASSWORD '${fixturePassword}';
ALTER ROLE readonly_migrator SET default_transaction_read_only = on;
`,
  );
  const config = {
    version: 1,
    workerName: 'quizmon-preflight-test',
    origin: 'https://game.example.test',
    sync: {
      version: 1,
      endpoint: 'https://sync.example.test',
      audience: 'quizmon-preflight',
    },
    hyperdriveId: '1'.repeat(32),
    mailFrom: 'signin@example.test',
    analyticsDataset: 'quizmon_test',
    authRateLimitNamespace: '2011',
    apiRateLimitNamespace: '2012',
  };
  await fixture('config.json', JSON.stringify(config));
  await fixture(
    'secrets.json',
    JSON.stringify({
      BETTER_AUTH_SECRET: fixtureSecret,
      VAPID_PRIVATE_KEY: curve.getPrivateKey().toString('base64url'),
    }),
  );
  await fixture(
    'database.json',
    JSON.stringify({
      version: 1,
      host: 'db.example.test',
      port: 5432,
      database: 'quizmon',
      user: 'migrator',
      password: fixturePassword,
    }),
  );
  await fixture('public-key.json', JSON.stringify(publicKey));
  docker('network', 'create', '--internal', prefix);
  network = true;
  docker(
    'run',
    '-d',
    '--name',
    prefix,
    '--network',
    prefix,
    '--network-alias',
    'db.example.test',
    '--network-alias',
    'wrong.example.test',
    '--tmpfs',
    '/var/lib/postgresql',
    '-e',
    'POSTGRES_PASSWORD=' + fixturePassword,
    '-v',
    directory + ':/fixture:ro',
    '-v',
    join(directory, 'init.sql') + ':/docker-entrypoint-initdb.d/test.sql:ro',
    postgres,
    'sh',
    '-c',
    'cp /fixture/server.key /tmp/server.key && chown postgres:postgres /tmp/server.key && chmod 600 /tmp/server.key && exec docker-entrypoint.sh postgres -c ssl=on -c ssl_cert_file=/fixture/server.crt -c ssl_key_file=/tmp/server.key',
  );
  started = true;
  docker(
    'run',
    '-d',
    '--name',
    prefix + '-plain',
    '--network',
    prefix,
    '--network-alias',
    'plain.example.test',
    '--tmpfs',
    '/var/lib/postgresql',
    '-e',
    'POSTGRES_PASSWORD=' + fixturePassword,
    postgres,
  );
  plainStarted = true;
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      docker('exec', prefix, 'pg_isready', '-U', 'migrator', '-d', 'quizmon');
      docker('exec', prefix + '-plain', 'pg_isready', '-U', 'postgres');
      ready = true;
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  assert.ok(ready, 'Disposable PostgreSQL failed to start.');
  const check = `
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {cp,readFile,writeFile} from 'node:fs/promises';
import {Client} from 'pg';
import {sealArtifact} from './deploy/release-artifact.ts';
const directory='/tmp/candidate';
await cp('.',directory,{recursive:true,filter:path=>!path.includes('node_modules')});
const publicKey=JSON.parse(await readFile('/fixture/public-key.json','utf8'));
await writeFile(directory+'/src/features/reminders/reminder-config.ts','export const VAPID_PUBLIC_KEY = '+JSON.stringify(publicKey)+';');
const manifest=JSON.parse(await readFile('manifest.json','utf8'));
await sealArtifact(directory,{...manifest.source,dirty:false});
const {symlink}=await import('node:fs/promises');
await symlink('/opt/quizmon/node_modules',directory+'/node_modules');
const base=JSON.parse(await readFile('/fixture/database.json','utf8'));
const admin=new Client({...base,ssl:{rejectUnauthorized:true}});
await admin.connect();
const snapshot=async()=>JSON.stringify((await admin.query("SELECT schemaname,tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY 1,2")).rows);
const before=await snapshot();
const run=(db,secrets='/fixture/secrets.json',env=process.env)=>{
  execFileSync(process.execPath,[directory+'/deploy/release-command.ts','preflight',directory,'/fixture/config.json',secrets,db],{encoding:'utf8',stdio:'pipe',env,timeout:20000});
};
run('/fixture/database.json');
run('/fixture/database.json');
let rejected=0;
const reject=(db,secrets,env)=>{
  assert.throws(()=>run(db,secrets,env),error=>{
    const logs=String(error.stdout)+String(error.stderr);
    assert.ok(!logs.includes(base.password));
    assert.ok(!logs.includes('private-secret-marker'));
    assert.ok(!logs.includes(JSON.parse(secretText).BETTER_AUTH_SECRET));
    rejected++;return true;
  });
};
const secretText=await readFile('/fixture/secrets.json','utf8');
for(const patch of [{host:'wrong.example.test'}, {host:'plain.example.test'}, {password:crypto.randomUUID()}, {user:'readonly_migrator'}, {ssl:false}]){
  await writeFile('/tmp/bad-db.json',JSON.stringify({...base,...patch}));
  reject('/tmp/bad-db.json');
}
const withoutTrust={...process.env};delete withoutTrust.NODE_EXTRA_CA_CERTS;
reject('/fixture/database.json',undefined,withoutTrust);
reject('/fixture/database.json',undefined,{...withoutTrust,PGSSLMODE:'no-verify'});
await writeFile('/tmp/malformed-secrets.json','{"private-secret-marker":');
reject('/fixture/database.json','/tmp/malformed-secrets.json');
await writeFile('/tmp/missing-secrets.json','{}');
reject('/fixture/database.json','/tmp/missing-secrets.json');
assert.equal(await snapshot(),before);
const {executeRelease}=await import(directory+'/deploy/execute-release.ts');
const {readdir}=await import('node:fs/promises');
const operation={version:1,id:crypto.randomUUID(),artifact:'sha256:'+'1'.repeat(64),configuration:'sha256:'+'2'.repeat(64)};
const receipt={versionId:crypto.randomUUID(),deploymentId:crypto.randomUUID()};
const originalSecret=JSON.parse(secretText).BETTER_AUTH_SECRET;
await writeFile('/tmp/rotating-secrets.json',secretText);
const options={artifactRoot:directory,configFile:'/fixture/config.json',secretsFile:'/tmp/rotating-secrets.json',databaseFile:'/fixture/database.json',operation,cloudflare:{accountId:'a'.repeat(32),token:'test-only'},temporaryRoot:'/tmp/execution',assertSelected:async()=>{}};
const adapter=()=>({
  activate:async(input)=>{
    await input.assertSelected();
    assert.equal(JSON.parse(await readFile(input.secretsFile,'utf8')).BETTER_AUTH_SECRET,originalSecret);
    return receipt;
  },
  inspect:async()=>receipt,
  verify:async(actual)=>assert.deepEqual(actual,receipt)
});
const result=await executeRelease({...options,assertSelected:async()=>{await writeFile('/tmp/rotating-secrets.json',JSON.stringify({...JSON.parse(secretText),BETTER_AUTH_SECRET:'changed-secret-value'.repeat(3)}));}},adapter);
assert.equal(result.status,'activated');
assert.deepEqual(await readdir('/tmp/execution'),[]);
await admin.end();
console.log('Release preflight passed: TLS and input rejection, redacted secrets, secret snapshot, and temporary-secret cleanup.');
console.log(JSON.stringify({preflight:true,rejected,unchangedDatabase:true,secretValuesRedacted:true}));
`;
  console.log(
    docker(
      'run',
      '--rm',
      '--read-only',
      '--cap-drop',
      'ALL',
      '--security-opt',
      'no-new-privileges',
      '--network',
      prefix,
      '--tmpfs',
      '/tmp',
      '-v',
      directory + ':/fixture:ro',
      '-e',
      'NODE_EXTRA_CA_CERTS=/fixture/ca.crt',
      '--entrypoint',
      'node',
      image,
      '--input-type=module',
      '--eval',
      check,
    ),
  );
} finally {
  if (plainStarted) docker('rm', '-fv', prefix + '-plain');
  if (started) docker('rm', '-fv', prefix);
  if (network) docker('network', 'rm', prefix);
  await rm(directory, { recursive: true, force: true });
}
