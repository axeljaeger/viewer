import { copyFile, mkdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

const sdkRoot = process.env.TDX_SDK_PATH ?? '3DxWare_SDK_v4-0-6_r22071';
const source = join(sdkRoot, 'web', '3DconnexionJS', 'build');
const destination = 'public/vendor/3dconnexion';
const files = ['3dconnexion.module.min.js'];

try {
  await stat(source);
} catch {
  throw new Error(`3Dconnexion SDK not found at ${source}. Set TDX_SDK_PATH to the extracted SDK directory.`);
}

await mkdir(destination, { recursive: true });
await Promise.all(files.map((file) => copyFile(join(source, file), join(destination, file))));
console.log(`Vendored 3DconnexionJS runtime from ${sdkRoot}.`);
