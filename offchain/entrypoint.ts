import fs from "fs/promises";
import path from "path";
import program from "cli";
import { getDirname } from "mynth-helper";

const commands = path.join(getDirname(import.meta.url), "commands");

const run = async () => {
  const files = await fs.readdir(commands);

  for (const file of files) {
    if (file.endsWith(".ts") && !file.endsWith(".d.ts"))
      await import(path.join(commands, file));
  }

  await program.parseAsync(process.argv);
};

run();
