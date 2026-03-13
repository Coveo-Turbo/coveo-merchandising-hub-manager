import {execFileSync} from 'node:child_process';
import {mkdirSync, rmSync, existsSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const extensionOutputDirectory = path.join(projectRoot, 'dist', 'extension');
const releaseOutputDirectory = path.join(projectRoot, 'dist', 'release');
const releaseArchivePath = path.join(releaseOutputDirectory, 'cmh-manager-extension.zip');

if (!existsSync(extensionOutputDirectory)) {
  throw new Error(`Missing extension build output at ${extensionOutputDirectory}. Run "npm run build:extension" first.`);
}

mkdirSync(releaseOutputDirectory, {recursive: true});
rmSync(releaseArchivePath, {force: true});

const packageJsonPath = path.join(projectRoot, 'package.json');
const {version} = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

execFileSync('zip', ['-r', releaseArchivePath, '.'], {
  cwd: extensionOutputDirectory,
  stdio: 'inherit',
});

console.log(`Created release archive ${releaseArchivePath} for version ${version}.`);
