import fs from "fs";
import path from "path";
import appRoot from "app-root-path";
import { Command } from "commander";

const packageJson = JSON.parse(
  fs.readFileSync(path.join(appRoot.path, "package.json"), "utf-8")
);

const program = new Command()
  .name("burn")
  .version(packageJson.version)
  .description(packageJson.description);

export default program;
