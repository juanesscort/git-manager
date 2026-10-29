#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const newVersion = process.argv[2];

if (!newVersion) {
  console.error("❌ Error: Debes especificar la nueva versión. Ejemplo: npm run bump 0.3.0");
  process.exit(1);
}

const semverRegex = /^\d+\.\d+\.\d+$/;
if (!semverRegex.test(newVersion)) {
  console.error(`❌ Error: "${newVersion}" no tiene un formato semver válido (X.Y.Z). Ejemplo: 0.3.0`);
  process.exit(1);
}

console.log(`🚀 Actualizando Git-Manager a la versión v${newVersion}...\n`);

// 1. Actualizar package.json
const pkgPath = path.join(rootDir, "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
const oldVersion = pkg.version;
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
console.log(`✅ package.json: ${oldVersion} -> ${newVersion}`);

// 2. Actualizar src-tauri/tauri.conf.json
const tauriConfPath = path.join(rootDir, "src-tauri", "tauri.conf.json");
const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, "utf-8"));
tauriConf.version = newVersion;
fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + "\n");
console.log(`✅ src-tauri/tauri.conf.json: ${oldVersion} -> ${newVersion}`);

// 3. Actualizar src-tauri/Cargo.toml
const cargoPath = path.join(rootDir, "src-tauri", "Cargo.toml");
let cargoToml = fs.readFileSync(cargoPath, "utf-8");
cargoToml = cargoToml.replace(
  /(\[package\][\s\S]*?version\s*=\s*")[^"]+(")/,
  `$1${newVersion}$2`
);
fs.writeFileSync(cargoPath, cargoToml);
console.log(`✅ src-tauri/Cargo.toml: ${oldVersion} -> ${newVersion}`);

console.log(`\n🎉 ¡Versión v${newVersion} sincronizada con éxito en todos los archivos!`);
console.log(`\nSiguientes pasos para publicar:`);
console.log(`  1. git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml`);
console.log(`  2. git commit -m "chore(release): v${newVersion}"`);
console.log(`  3. git tag v${newVersion}`);
console.log(`  4. git push origin main && git push origin v${newVersion}\n`);
