// @ts-check
// Do not run this file directly. Run it via `npm run watch`. See package.json for more info.
const { spawn } = require("child_process");

/**
 *
 * @param {string} program
 * @param {string[]} args
 * @returns {ReturnType<typeof spawn>}
 */
function cmd(program, args = []) {
  const spawnOptions = { shell: true };
  console.log("CMD:", program, args.flat(), spawnOptions);
  // NOTE: flattening the args array enables you to group related arguments
  // for better self-documentation of the running command
  const p = spawn(program, args.flat(), spawnOptions);
  // @ts-ignore [stdout may be null?]
  p.stdout.on("data", (data) => process.stdout.write(data));
  // @ts-ignore [stdout may be null?]
  p.stderr.on("data", (data) => process.stderr.write(data));
  p.on("close", (code) => {
    if (code !== 0) {
      console.error(program, args, "exited with", code);
    }
  });
  return p;
}

cmd("tsc", []);
