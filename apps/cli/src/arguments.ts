import { FLAG_OPTIONS, VALUE_OPTIONS } from "./constants.ts";
import { IMPORT_LIMITS } from "../../../modules/ads-core/src/index.ts";

export interface CliArguments {
  command: string;
  positional: string[];
  options: Record<string, string | boolean>;
}

/** A usage failure is distinct from a document or persistence rejection. */
export class CliUsageError extends Error {}

/** Parse explicit options without interpreting file names after the `--` boundary. */
export function parseArguments(args: readonly string[]): CliArguments {
  const positional: string[] = [];
  const options: Record<string, string | boolean> = {};
  let literal = false;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]!;
    if (argument === "--" && !literal) { literal = true; continue; }
    if (!literal && argument.startsWith("--")) {
      const key = argument.slice(2);
      if (Object.hasOwn(options, key)) throw new CliUsageError(`Duplicate option: --${key}`);
      if (FLAG_OPTIONS.some((option) => option === key)) { options[key] = true; continue; }
      if (!VALUE_OPTIONS.some((option) => option === key)) throw new CliUsageError(`Unknown option: ${argument}`);
      const value = args[index + 1];
      if (value === undefined || value.startsWith("--") || value.length === 0) throw new CliUsageError(`Missing value for ${argument}`);
      options[key] = value;
      index += 1;
    } else positional.push(argument);
  }
  const command = positional.shift() ?? "help";
  return { command, positional, options };
}

/** Reject unrelated flags so a misspelled approval cannot silently change behavior. */
export function checkOptions(input: CliArguments, allowed: readonly string[], minimum: number, maximum: number): void {
  for (const key of Object.keys(input.options)) {
    if (!["store", "help", ...allowed].includes(key)) throw new CliUsageError(`--${key} is not valid for ${input.command}`);
  }
  if (input.positional.length < minimum || input.positional.length > maximum) throw new CliUsageError(`Incorrect arguments for ${input.command}; run help for usage`);
}

/** Reject all syntactic usage errors before opening or locking the selected store. */
export function validateArguments(input: CliArguments): void {
  switch (input.command) {
    case "init": checkOptions(input, ["project", "name"], 0, 0); break;
    case "import":
    case "update":
      checkOptions(input, input.command === "import" ? ["approve", "draft", "draft-id", "structural"] : ["approve", "draft-id", "structural"], 1, IMPORT_LIMITS.maxDocuments);
      if (input.options.draft && (input.options.approve || input.options["draft-id"])) throw new CliUsageError("--draft cannot combine with --approve or --draft-id");
      if (input.options["draft-id"] && input.positional.length !== 1) throw new CliUsageError("--draft-id binds exactly one source file");
      break;
    case "delete": checkOptions(input, ["approve"], 1, IMPORT_LIMITS.maxDocuments); break;
    case "show":
    case "undo":
    case "redo": checkOptions(input, [], 0, 1); break;
    case "candidate":
    case "draft": checkOptions(input, [], 1, 1); break;
    case "drafts":
    case "diagnostics":
    case "validate":
    case "history":
    case "recover-lock": checkOptions(input, [], 0, 0); break;
    case "export":
      checkOptions(input, ["out"], 1, 1);
      if (typeof input.options.out !== "string") throw new CliUsageError("Choose a fresh export directory with --out <directory>");
      break;
    case "review":
      checkOptions(input, ["approve", "reject"], 1, 1);
      if (Boolean(input.options.approve) === Boolean(input.options.reject)) throw new CliUsageError("Choose exactly one of --approve or --reject for review");
      break;
    case "apply":
      checkOptions(input, ["approve", "token"], 1, 1);
      if (Boolean(input.options.approve) === Boolean(input.options.token)) throw new CliUsageError("Choose exactly one of --approve or --token for apply");
      break;
    default: throw new CliUsageError(`Unknown command: ${input.command}`);
  }
}
