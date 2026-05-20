import { Command } from 'commander';
import { apiDetailCommand } from './commands/api-detail';
import { searchApisCommand } from './commands/search-apis';

declare const __VERSION__: string;
declare const __DESCRIPTION__: string;

export function createProgram(): Command {
  const program = new Command();

  program
    .name('fox-api-kit')
    .description(__DESCRIPTION__)
    .version(__VERSION__);

  program.addCommand(apiDetailCommand);
  program.addCommand(searchApisCommand);

  return program;
}

export async function run(argv: string[] = process.argv): Promise<void> {
  const program = createProgram();
  try {
    await program.parseAsync(argv);
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }
}
