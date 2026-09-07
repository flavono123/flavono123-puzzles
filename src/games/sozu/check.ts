import { applyFacings } from "./engine";
import { simulate } from "./live";
import { STAGES } from "./stages";

let failed = 0;

for (const stage of STAGES) {
  const solved = applyFacings(stage.grid, stage.solution);
  const result = simulate(stage, solved);
  const open = simulate(stage, stage.grid);
  const mark = result.win ? "ok" : "FAIL";
  if (!result.win) failed += 1;
  console.log(
    `#${stage.id} ${mark} solved=${result.win} unsolved=${open.win ? "WIN" : "locked"}`,
  );
}

process.exit(failed === 0 ? 0 : 1);
