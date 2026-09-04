import { applyFacings, simulate } from "./engine";
import { STAGES } from "./stages";

let failed = 0;

for (const stage of STAGES) {
  const solved = applyFacings(stage.grid, stage.solution);
  const result = simulate(stage, solved);
  const mark = result.win ? "ok" : "FAIL";
  if (!result.win) failed += 1;
  const kinds = result.events.reduce<Record<string, number>>((acc, ev) => {
    acc[ev.kind] = (acc[ev.kind] ?? 0) + 1;
    return acc;
  }, {});
  console.log(
    `#${stage.id} ${mark} pond=${result.pond}/${stage.need} events=${JSON.stringify(kinds)}`,
  );
}

process.exit(failed === 0 ? 0 : 1);
