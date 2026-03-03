/**
 * Python to TypeScript Type Generator
 *
 * Reads Pydantic models from the Python backend and generates TypeScript interfaces.
 * This is a simple regex-based approach for the current schema structure.
 *
 * Usage: pnpm generate:types
 */

import * as fs from "fs";
import * as path from "path";

const PYTHON_SCHEMAS_DIR = path.join(
  __dirname,
  "../apps/python-backend/src/assistant/schemas"
);
const OUTPUT_FILE = path.join(
  __dirname,
  "../apps/event-app/src/types/generated/python-backend.ts"
);

interface FieldInfo {
  name: string;
  type: string;
  optional: boolean;
  description?: string;
}

interface ModelInfo {
  name: string;
  fields: FieldInfo[];
  docstring?: string;
}

function pythonTypeToTypeScript(pythonType: string): string {
  // Handle common Python to TypeScript type mappings
  const typeMap: Record<string, string> = {
    str: "string",
    int: "number",
    float: "number",
    bool: "boolean",
    None: "null",
    Any: "unknown",
    "list[str]": "string[]",
    "list[int]": "number[]",
    "dict[str, Any]": "Record<string, unknown>",
  };

  // Check direct mapping
  if (typeMap[pythonType]) {
    return typeMap[pythonType];
  }

  // Handle Optional[X] -> X | null
  const optionalMatch = pythonType.match(/Optional\[(.+)\]/);
  if (optionalMatch) {
    return `${pythonTypeToTypeScript(optionalMatch[1])} | null`;
  }

  // Handle list[X] -> X[]
  const listMatch = pythonType.match(/list\[(.+)\]/i);
  if (listMatch) {
    return `${pythonTypeToTypeScript(listMatch[1])}[]`;
  }

  // Handle Union[X, Y] -> X | Y
  const unionMatch = pythonType.match(/Union\[(.+)\]/);
  if (unionMatch) {
    const types = unionMatch[1].split(",").map((t) => t.trim());
    return types.map(pythonTypeToTypeScript).join(" | ");
  }

  // Handle str | None -> string | null
  if (pythonType.includes(" | ")) {
    const types = pythonType.split(" | ").map((t) => t.trim());
    return types.map(pythonTypeToTypeScript).join(" | ");
  }

  // Default: return as-is (likely a custom type)
  return pythonType;
}

function parseField(line: string): FieldInfo | null {
  // Match field definitions like:
  // message: str = Field(..., min_length=1, description="The user's message")
  // thread_id: str = Field(default="default", description="...")
  // status: str = Field(default="ok", description="Health status")
  const fieldMatch = line.match(
    /^\s+(\w+):\s+(.+?)\s*=\s*Field\(([^)]*)\)/
  );

  if (!fieldMatch) {
    // Try simpler pattern: name: type
    const simpleMatch = line.match(/^\s+(\w+):\s+(.+?)(?:\s*=\s*(.+))?$/);
    if (simpleMatch) {
      const [, name, type, defaultVal] = simpleMatch;
      return {
        name,
        type: pythonTypeToTypeScript(type.trim()),
        optional: defaultVal !== undefined && defaultVal !== "...",
      };
    }
    return null;
  }

  const [, name, type, fieldArgs] = fieldMatch;

  // Check if optional (has default or default= in Field args)
  const hasDefault =
    fieldArgs.includes("default=") && !fieldArgs.includes("default=...");

  // Extract description if present
  const descMatch = fieldArgs.match(/description="([^"]+)"/);
  const description = descMatch ? descMatch[1] : undefined;

  return {
    name,
    type: pythonTypeToTypeScript(type.trim()),
    optional: hasDefault,
    description,
  };
}

function parseModel(content: string): ModelInfo[] {
  const models: ModelInfo[] = [];
  const lines = content.split("\n");

  let currentModel: ModelInfo | null = null;
  let inClass = false;
  let classIndent = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match class definition: class ClassName(BaseModel):
    const classMatch = line.match(/^class\s+(\w+)\s*\(\s*BaseModel\s*\):/);
    if (classMatch) {
      if (currentModel) {
        models.push(currentModel);
      }

      // Check for docstring in next line
      let docstring: string | undefined;
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const docMatch = nextLine.match(/^\s+"""(.+?)"""/);
        if (docMatch) {
          docstring = docMatch[1];
        }
      }

      currentModel = {
        name: classMatch[1],
        fields: [],
        docstring,
      };
      inClass = true;
      classIndent = line.search(/\S/);
      continue;
    }

    // Check if we're still in the class
    if (inClass && currentModel) {
      const lineIndent = line.search(/\S/);

      // Empty line or dedented - end of class
      if (line.trim() === "" || (lineIndent !== -1 && lineIndent <= classIndent)) {
        if (line.trim() !== "" && !line.startsWith("class")) {
          // This is a new declaration at same or lower indent, end class
          models.push(currentModel);
          currentModel = null;
          inClass = false;
        }
        continue;
      }

      // Parse field
      const field = parseField(line);
      if (field) {
        currentModel.fields.push(field);
      }
    }
  }

  // Don't forget the last model
  if (currentModel) {
    models.push(currentModel);
  }

  return models;
}

function generateTypeScript(models: ModelInfo[]): string {
  const lines: string[] = [
    "/**",
    " * Auto-generated TypeScript types from Python Pydantic models",
    ` * Generated at: ${new Date().toISOString()}`,
    " *",
    " * DO NOT EDIT MANUALLY - run `pnpm generate:types` to regenerate",
    " */",
    "",
  ];

  for (const model of models) {
    // Add JSDoc
    if (model.docstring) {
      lines.push(`/** ${model.docstring} */`);
    }

    lines.push(`export interface ${model.name} {`);

    for (const field of model.fields) {
      const optionalMark = field.optional ? "?" : "";
      if (field.description) {
        lines.push(`  /** ${field.description} */`);
      }
      lines.push(`  ${field.name}${optionalMark}: ${field.type};`);
    }

    lines.push("}");
    lines.push("");
  }

  return lines.join("\n");
}

function main() {
  console.log("Generating TypeScript types from Python Pydantic models...");

  // Read all Python files in schemas directory
  const allModels: ModelInfo[] = [];

  if (!fs.existsSync(PYTHON_SCHEMAS_DIR)) {
    console.error(`Schema directory not found: ${PYTHON_SCHEMAS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(PYTHON_SCHEMAS_DIR);

  for (const file of files) {
    if (!file.endsWith(".py") || file.startsWith("__")) {
      continue;
    }

    const filePath = path.join(PYTHON_SCHEMAS_DIR, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const models = parseModel(content);

    console.log(`  ${file}: found ${models.length} model(s)`);
    allModels.push(...models);
  }

  if (allModels.length === 0) {
    console.log("No models found, skipping type generation.");
    return;
  }

  // Generate TypeScript
  const typescript = generateTypeScript(allModels);

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write output file
  fs.writeFileSync(OUTPUT_FILE, typescript);
  console.log(`\nGenerated ${allModels.length} interface(s) to: ${OUTPUT_FILE}`);
}

main();
