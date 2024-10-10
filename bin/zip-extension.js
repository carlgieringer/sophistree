const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const version = packageJson.version;

const distDir = path.join(__dirname, "..", "dist");
const prodDir = path.join(distDir, "prod");
const zipFile = path.join(distDir, `sophistree-${version}.zip`);

if (!fs.existsSync(prodDir)) {
  console.error("Error: dist/prod directory does not exist");
  process.exit(1);
}

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

try {
  if (process.platform === "win32") {
    // For Windows
    execSync(
      `powershell Compress-Archive -Path "${prodDir}\\*" -DestinationPath "${zipFile}" -Force`,
    );
  } else {
    // For Unix-like systems
    const command = `cd "${prodDir}" && zip -r "${zipFile}" .`;
    console.debug(`Running command: ${command}`);
    execSync(command);
  }
  console.log(`Created ${zipFile}`);
} catch (error) {
  console.error("Error creating zip file:", error);
  process.exit(1);
}
