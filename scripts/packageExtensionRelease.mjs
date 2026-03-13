import {mkdirSync, rmSync, existsSync, readFileSync, writeFileSync, readdirSync, statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {crc32, deflateRawSync} from 'node:zlib';

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

const collectFiles = (dir, baseDir = dir) => {
  const entries = [];
  for (const name of readdirSync(dir)) {
    const fullPath = path.join(dir, name);
    if (statSync(fullPath).isDirectory()) {
      entries.push(...collectFiles(fullPath, baseDir));
    } else {
      const relPath = path.relative(baseDir, fullPath).split(path.sep).join('/');
      entries.push({fullPath, relPath});
    }
  }
  return entries;
};

const createZip = (outputPath, baseDir) => {
  const files = collectFiles(baseDir);
  const chunks = [];
  const centralDirEntries = [];
  let offset = 0;

  for (const {fullPath, relPath} of files) {
    const data = readFileSync(fullPath);
    const checksum = crc32(data) >>> 0;
    const deflated = deflateRawSync(data, {level: 6});
    const useDeflate = deflated.length < data.length;
    const method = useDeflate ? 8 : 0;
    const compressed = useDeflate ? deflated : data;
    const nameBytes = Buffer.from(relPath, 'utf8');

    const localHeader = Buffer.alloc(30 + nameBytes.length);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(method, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(nameBytes.length, 26);
    localHeader.writeUInt16LE(0, 28);
    nameBytes.copy(localHeader, 30);

    const centralEntry = Buffer.alloc(46 + nameBytes.length);
    centralEntry.writeUInt32LE(0x02014b50, 0);
    centralEntry.writeUInt16LE(20, 4);
    centralEntry.writeUInt16LE(20, 6);
    centralEntry.writeUInt16LE(0, 8);
    centralEntry.writeUInt16LE(method, 10);
    centralEntry.writeUInt16LE(0, 12);
    centralEntry.writeUInt16LE(0, 14);
    centralEntry.writeUInt32LE(checksum, 16);
    centralEntry.writeUInt32LE(compressed.length, 20);
    centralEntry.writeUInt32LE(data.length, 24);
    centralEntry.writeUInt16LE(nameBytes.length, 28);
    centralEntry.writeUInt16LE(0, 30);
    centralEntry.writeUInt16LE(0, 32);
    centralEntry.writeUInt16LE(0, 34);
    centralEntry.writeUInt16LE(0, 36);
    centralEntry.writeUInt32LE(0, 38);
    centralEntry.writeUInt32LE(offset, 42);
    nameBytes.copy(centralEntry, 46);

    offset += localHeader.length + compressed.length;
    chunks.push(localHeader, compressed);
    centralDirEntries.push(centralEntry);
  }

  const centralDirBuffer = Buffer.concat(centralDirEntries);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(centralDirEntries.length, 8);
  eocd.writeUInt16LE(centralDirEntries.length, 10);
  eocd.writeUInt32LE(centralDirBuffer.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  writeFileSync(outputPath, Buffer.concat([...chunks, centralDirBuffer, eocd]));
};

createZip(releaseArchivePath, extensionOutputDirectory);

console.log(`Created release archive ${releaseArchivePath} for version ${version}.`);
