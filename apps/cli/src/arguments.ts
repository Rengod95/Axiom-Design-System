import { FLAG_OPTIONS, VALUE_OPTIONS } from "./constants.ts";

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
