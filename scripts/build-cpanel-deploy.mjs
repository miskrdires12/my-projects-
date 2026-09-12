import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { ZipArchive } = require("archiver");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const standaloneDir = path.join(projectRoot, ".next", "standalone");
const stagingDir = path.join(projectRoot, "deploy_staging");
const zipPath = path.join(projectRoot, "deploy.zip");

console.log("🚀 Starting cPanel Deployment Package Assembly...");
console.log(`📁 Project Root: ${projectRoot}`);
console.log(`📁 Standalone Source: ${standaloneDir}`);
console.log(`📁 Staging Destination: ${stagingDir}`);
console.log(`📦 Output Archive: ${zipPath}`);

if (!fs.existsSync(standaloneDir)) {
  console.error("❌ Error: .next/standalone does not exist! Please run 'npm run build' first.");
  process.exit(1);
}

// 1. Clean and prepare staging directory
if (fs.existsSync(stagingDir)) {
  console.log("🧹 Cleaning old staging directory...");
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
fs.mkdirSync(stagingDir, { recursive: true });

if (fs.existsSync(zipPath)) {
  console.log("🧹 Removing existing deploy.zip...");
  fs.unlinkSync(zipPath);
}

// Helper to copy recursively
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 2. Copy all files and folders from .next/standalone/ into stagingDir
console.log("📦 Copying standalone build into staging root...");
copyDirSync(standaloneDir, stagingDir);

// Verify server.js exists at root of staging
const serverJsPath = path.join(stagingDir, "server.js");
if (!fs.existsSync(serverJsPath)) {
  console.error("❌ Error: server.js not found at the root of standalone build!");
  process.exit(1);
}
console.log("✅ Verified: server.js is located at the root of staging.");

// 3. Copy root public/ into stagingDir/public/
const rootPublicDir = path.join(projectRoot, "public");
const stagingPublicDir = path.join(stagingDir, "public");
if (fs.existsSync(rootPublicDir)) {
  console.log("🖼️ Copying complete public directory...");
  copyDirSync(rootPublicDir, stagingPublicDir);
  console.log("✅ Public assets copied successfully.");
}

// 4. Copy root .next/static/ into stagingDir/.next/static/
const rootStaticDir = path.join(projectRoot, ".next", "static");
const stagingStaticDir = path.join(stagingDir, ".next", "static");
if (fs.existsSync(rootStaticDir)) {
  console.log("⚡ Copying .next/static chunks and stylesheets...");
  copyDirSync(rootStaticDir, stagingStaticDir);
  console.log("✅ .next/static copied successfully.");
} else {
  console.warn("⚠️ Warning: .next/static not found in root .next directory.");
}

// 5. Copy root prisma/ into stagingDir/prisma/
const rootPrismaDir = path.join(projectRoot, "prisma");
const stagingPrismaDir = path.join(stagingDir, "prisma");
if (fs.existsSync(rootPrismaDir)) {
  console.log("🗄️ Copying prisma schema and SQLite database...");
  copyDirSync(rootPrismaDir, stagingPrismaDir);
  console.log("✅ Prisma schema and database copied successfully.");
}

// Also ensure a root dev.db exists in staging for fallback resolution
const devDbSrc = path.join(rootPrismaDir, "dev.db");
if (fs.existsSync(devDbSrc)) {
  fs.copyFileSync(devDbSrc, path.join(stagingDir, "dev.db"));
  console.log("✅ Root dev.db fallback copied.");
}

// 6. Write production .env file
const envProductionContent = `# ==========================================
# SILICON LABS — PRODUCTION cPanel Node.js 20
# ==========================================
DATABASE_URL="file:./prisma/dev.db"
AUTH_SECRET="student-bridge-enterprise-secret-key-32-chars-minimum-prod-grade"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="production"
PORT=3000
`;
fs.writeFileSync(path.join(stagingDir, ".env"), envProductionContent);
fs.writeFileSync(path.join(stagingDir, ".env.production"), envProductionContent);
console.log("✅ Production .env and .env.production configured.");

// 7. Compress into deploy.zip using archiver with root items directly at archive root
console.log("🗜️ Compressing staging directory into deploy.zip...");

const output = fs.createWriteStream(zipPath);
const archive = new ZipArchive({
  zlib: { level: 9 }, // Maximum compression
});

output.on("close", () => {
  const totalBytes = archive.pointer();
  const mb = (totalBytes / (1024 * 1024)).toFixed(2);
  console.log(`\n🎉 SUCCESS! deploy.zip generated successfully.`);
  console.log(`📦 Archive Size: ${mb} MB (${totalBytes.toLocaleString()} bytes)`);
  console.log(`📍 Location: ${zipPath}`);
  console.log(`\nDeployment Instructions for cPanel (Yegara Hosting):`);
  console.log(`1. Upload deploy.zip to your application directory in cPanel File Manager.`);
  console.log(`2. Extract deploy.zip (server.js will sit directly at the root).`);
  console.log(`3. In cPanel > Setup Node.js App:`);
  console.log(`   - Node.js version: 20.x`);
  console.log(`   - Application mode: Production`);
  console.log(`   - Application startup file: server.js`);
  console.log(`4. Click 'Start App' or 'Restart'.`);
});

archive.on("error", (err) => {
  console.error("❌ Archive error:", err);
  process.exit(1);
});

archive.pipe(output);

// Walk stagingDir and add all files with relative paths
function addDirectoryToArchive(dir, baseDir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, "/");
    if (entry.isDirectory()) {
      addDirectoryToArchive(fullPath, baseDir);
    } else {
      archive.file(fullPath, { name: relativePath });
    }
  }
}

addDirectoryToArchive(stagingDir, stagingDir);
archive.finalize();
