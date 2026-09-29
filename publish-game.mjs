import {spawnSync} from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
// Credentials enter through hidden stdin and remain only in process memory.
if(process.stdin.isTTY)process.stdin.setRawMode(true);
console.log('Ready for publication JSON on stdin (input is hidden).');
const input=await new Promise((resolve,reject)=>{let buffer='';process.stdin.setEncoding('utf8');const receive=chunk=>{buffer+=chunk;if(/[\r\n]/.test(buffer)){process.stdin.removeListener('data',receive);process.stdin.pause();if(process.stdin.isTTY)process.stdin.setRawMode(false);try{resolve(JSON.parse(buffer.trim()));}catch(e){reject(e);}}};process.stdin.on('data',receive);process.stdin.resume();});
const cwd=path.resolve(input.checkout),credential=input.credential;
function run(args,env=process.env){const r=spawnSync('git',['-c','safe.directory='+cwd,...args],{cwd,env,encoding:'utf8',windowsHide:true});if(r.status!==0)throw new Error('Git operation failed: '+r.stderr.replaceAll(credential.token,'[redacted]'));return r.stdout.trim();}
if(!fs.existsSync(path.join(cwd,'.git')))run(['init','-b',credential.branch]);
const remotes=run(['remote']).split('\n');if(remotes.includes('origin'))run(['remote','set-url','origin',credential.remote_url]);else run(['remote','add','origin',credential.remote_url]);
run(['add','.']);
const dirty=run(['status','--porcelain']);if(dirty)run(['-c','user.name=Codex','-c','user.email=codex@local.invalid','commit','-m','Build Grand Theft Vehicles driving playground']);
const sha=run(['rev-parse','HEAD']);
const env={...process.env,GIT_TERMINAL_PROMPT:'0',GIT_CONFIG_COUNT:'1',GIT_CONFIG_KEY_0:'http.'+credential.remote_url+'.extraheader',GIT_CONFIG_VALUE_0:'Authorization: Basic '+Buffer.from('x-access-token:'+credential.token).toString('base64')};
run(['push','origin','HEAD:refs/heads/'+credential.branch],env);
const remoteSha=run(['ls-remote','origin','refs/heads/'+credential.branch],env).split(/\s+/)[0];if(remoteSha!==sha)throw new Error('Remote source verification failed');
const archive=path.resolve(input.archive);const packed=spawnSync('tar',['-czf',archive,'.openai/hosting.json','dist'],{cwd,encoding:'utf8',windowsHide:true});if(packed.status!==0)throw new Error(packed.stderr);
console.log(JSON.stringify({commit_sha:sha,archive,source_verified:true}));
