import { mkdirSync, existsSync } from "fs";
import { join } from "path";

const REPOS_DIR = join(import.meta.dir, "../../repos");

// Ensure repos directory exists
if (!existsSync(REPOS_DIR)) {
  mkdirSync(REPOS_DIR, { recursive: true });
}

/**
 * Clone a Git repository to local storage
 */
export async function cloneRepo(
  repoUrl: string,
  projectId: string
): Promise<string> {
  const targetDir = join(REPOS_DIR, projectId);

  // Remove existing if re-cloning
  if (existsSync(targetDir)) {
    const rmProc = Bun.spawn(
      process.platform === "win32"
        ? ["cmd", "/c", "rmdir", "/s", "/q", targetDir]
        : ["rm", "-rf", targetDir],
      { stdout: "pipe", stderr: "pipe" }
    );
    await rmProc.exited;
  }

  console.log(`📥 Cloning ${repoUrl} → ${targetDir}`);

  const proc = Bun.spawn(
    ["git", "clone", "--depth", "1", repoUrl, targetDir],
    { stdout: "pipe", stderr: "pipe" }
  );

  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    throw new Error(`Git clone failed: ${stderr}`);
  }

  console.log(`✅ Cloned successfully to ${targetDir}`);
  return targetDir;
}

/**
 * Auto-detect project language based on files in directory
 */
export function detectLanguage(dir: string): string {
  const checks: [string, string][] = [
    ["package.json", "JavaScript/TypeScript"],
    ["tsconfig.json", "TypeScript"],
    ["requirements.txt", "Python"],
    ["Pipfile", "Python"],
    ["pyproject.toml", "Python"],
    ["go.mod", "Go"],
    ["Cargo.toml", "Rust"],
    ["pom.xml", "Java"],
    ["build.gradle", "Java"],
    ["composer.json", "PHP"],
    ["Gemfile", "Ruby"],
    ["*.csproj", "C#"],
    ["CMakeLists.txt", "C/C++"],
  ];

  for (const [file, lang] of checks) {
    if (existsSync(join(dir, file))) {
      return lang;
    }
  }

  return "Unknown";
}
