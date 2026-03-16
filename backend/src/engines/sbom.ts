import { nanoid } from "nanoid";
import { existsSync } from "fs";
import { join } from "path";

interface SbomComponent {
  name: string;
  version: string;
  type: string;
  license?: string;
  purl?: string;
}

interface SbomResult {
  bomFormat: string;
  specVersion: string;
  components: SbomComponent[];
}

/**
 * Generate SBOM using cdxgen or parse package files
 */
export async function generateSbom(
  targetPath: string
): Promise<SbomResult> {
  console.log(`📋 Generating SBOM for: ${targetPath}`);

  // Try cdxgen first
  try {
    const proc = Bun.spawn(
      ["cdxgen", "-o", "-", "--format", "json", targetPath],
      { stdout: "pipe", stderr: "pipe" }
    );

    const output = await new Response(proc.stdout).text();
    await proc.exited;

    if (output && output.trim()) {
      const result = JSON.parse(output);
      return {
        bomFormat: result.bomFormat || "CycloneDX",
        specVersion: result.specVersion || "1.5",
        components: (result.components || []).map((c: any) => ({
          name: c.name,
          version: c.version,
          type: c.type || "library",
          license: c.licenses?.[0]?.license?.id || c.licenses?.[0]?.license?.name,
          purl: c.purl,
        })),
      };
    }
  } catch (e: any) {
    console.log(`⚠️ cdxgen not available: ${e.message}`);
  }

  // Fallback: parse package.json manually
  const pkgPath = join(targetPath, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(await Bun.file(pkgPath).text());
      const components: SbomComponent[] = [];

      for (const [name, version] of Object.entries(pkg.dependencies || {})) {
        components.push({
          name,
          version: (version as string).replace(/[\^~>=<]/g, ""),
          type: "library",
          purl: `pkg:npm/${name}@${(version as string).replace(/[\^~>=<]/g, "")}`,
        });
      }

      for (const [name, version] of Object.entries(pkg.devDependencies || {})) {
        components.push({
          name,
          version: (version as string).replace(/[\^~>=<]/g, ""),
          type: "library",
          purl: `pkg:npm/${name}@${(version as string).replace(/[\^~>=<]/g, "")}`,
        });
      }

      return {
        bomFormat: "CycloneDX",
        specVersion: "1.5",
        components,
      };
    } catch (e) {
      console.log("⚠️ Could not parse package.json");
    }
  }

  // Fallback demo data
  console.log("⚠️ Using demo SBOM data");
  return generateDemoSbom();
}

function generateDemoSbom(): SbomResult {
  return {
    bomFormat: "CycloneDX",
    specVersion: "1.5",
    components: [
      { name: "react", version: "19.2.3", type: "library", license: "MIT", purl: "pkg:npm/react@19.2.3" },
      { name: "next", version: "16.1.6", type: "framework", license: "MIT", purl: "pkg:npm/next@16.1.6" },
      { name: "hono", version: "4.12.8", type: "framework", license: "MIT", purl: "pkg:npm/hono@4.12.8" },
      { name: "drizzle-orm", version: "0.38.4", type: "library", license: "Apache-2.0", purl: "pkg:npm/drizzle-orm@0.38.4" },
      { name: "zod", version: "3.25.76", type: "library", license: "MIT", purl: "pkg:npm/zod@3.25.76" },
      { name: "nanoid", version: "5.1.6", type: "library", license: "MIT", purl: "pkg:npm/nanoid@5.1.6" },
      { name: "recharts", version: "3.8.0", type: "library", license: "MIT", purl: "pkg:npm/recharts@3.8.0" },
      { name: "lucide-react", version: "0.577.0", type: "library", license: "ISC", purl: "pkg:npm/lucide-react@0.577.0" },
      { name: "lodash", version: "4.17.15", type: "library", license: "MIT", purl: "pkg:npm/lodash@4.17.15" },
      { name: "express", version: "4.17.1", type: "framework", license: "MIT", purl: "pkg:npm/express@4.17.1" },
      { name: "jsonwebtoken", version: "8.5.1", type: "library", license: "MIT", purl: "pkg:npm/jsonwebtoken@8.5.1" },
      { name: "axios", version: "1.7.0", type: "library", license: "MIT", purl: "pkg:npm/axios@1.7.0" },
    ],
  };
}
