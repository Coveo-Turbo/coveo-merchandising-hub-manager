import {readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const packageJsonPath = path.join(projectRoot, 'package.json');
const manifestPath = path.join(projectRoot, 'src', 'extension', 'manifest.ts');

const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const nextVersion = packageJson.version;
const manifestSource = readFileSync(manifestPath, 'utf8');
const manifestVersionPattern = /version:\s+'[^']+',/;

if (!manifestVersionPattern.test(manifestSource)) {
  throw new Error(`Unable to find extension manifest version in ${manifestPath}.`);
}

const updatedManifestSource = manifestSource.replace(manifestVersionPattern, `version: '${nextVersion}',`);
writeFileSync(manifestPath, updatedManifestSource);

console.log(`Synchronized extension manifest version to ${nextVersion}.`);
