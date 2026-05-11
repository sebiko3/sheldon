import React, { useEffect, useRef, useState } from "react";
import { Box, Text, useApp, useInput, useStdin } from "ink";
import { loadAllMissions, readHandoffSummary, type LoadedMission } from "./missions.js";
import { watchMissions } from "./watcher.js";
import { diffStat } from "./git.js";
import { osNotify, pbcopy } from "./notify.js";
import type { Phase } from "./types.js";

interface AppProps {
  repoRoot: string;
}

const PHASE_COLORS: Record<Phase, string> = {
  planning: "cyan",
  contract_review: "yellow",
  implementing: "magenta",
  handed_off: "blue",
  validating: "yellow",
  validated: "green",
  rejected: "red",
  done: "green",
  aborted: "gray",
};

function fmtTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString("en-GB", { hour12: false });
}

function shortId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id;
}

export function App({ repoRoot }: AppProps) {
  const { exit } = useApp();
  const [missions, setMissions] = useState<LoadedMission[]>([]);
  const [selected, setSelected] = useState(0);
  const [statusLine, setStatusLine] = useState("");
  const [diff, setDiff] = useState<string>("");
  const lastValidationCount = useRef<Map<string, number>>(new Map());

  // Watcher → reload missions on any change under .missions/
  useEffect(() => {
    const w = watchMissions(repoRoot, () => {
      const loaded = loadAllMissions(repoRoot);
      setMissions(loaded);
      // Surface a Notification Center alert when a mission gains a new
      // validation_run entry (i.e., the Validator just reported a verdict).
      for (const m of loaded) {
        if (!("state" in m)) continue;
        const prev = lastValidationCount.current.get(m.state.id) ?? 0;
        const curr = m.state.validation_runs.length;
        if (curr > prev) {
          const last = m.state.validation_runs[curr - 1];
          if (last) {
            osNotify(
              `sheldon: validator ${last.verdict.toUpperCase()}`,
              `${shortId(m.state.id)} — ${m.state.goal}`,
            );
          }
        }
        lastValidationCount.current.set(m.state.id, curr);
      }
    });
    return () => w.close();
  }, [repoRoot]);

  // Clamp selection when mission list shrinks
  useEffect(() => {
    if (selected >= missions.length && missions.length > 0) {
      setSelected(missions.length - 1);
    }
  }, [missions.length, selected]);

  const current = missions[selected];

  // Load diff stat asynchronously whenever the selected mission changes.
  useEffect(() => {
    if (!current || !("state" in current)) {
      setDiff("");
      return;
    }
    let cancelled = false;
    diffStat(repoRoot, current.state.branch, current.state.base_commit).then((d) => {
      if (!cancelled) setDiff(d.trim() || "(no changes since base_commit)");
    });
    return () => {
      cancelled = true;
    };
  }, [current, repoRoot]);

  const { isRawModeSupported } = useStdin();

  const onKey = (input: string, key: { upArrow: boolean; downArrow: boolean; tab: boolean; ctrl: boolean }) => {
    if (input === "q" || (key.ctrl && input === "c")) {
      exit();
      return;
    }
    if (key.upArrow || input === "k") {
      setSelected((s) => Math.max(0, s - 1));
      return;
    }
    if (key.downArrow || input === "j" || key.tab) {
      setSelected((s) => Math.min(missions.length - 1, s + 1));
      return;
    }
    if (input === "a" && current && "state" in current) {
      const cmd = `/sheldon:mission-approve ${current.state.id}`;
      void pbcopy(cmd).then(() => setStatusLine(`copied: ${cmd}`));
      return;
    }
    if (input === "s" && current && "state" in current) {
      const cmd = `/sheldon:mission-status ${current.state.id}`;
      void pbcopy(cmd).then(() => setStatusLine(`copied: ${cmd}`));
      return;
    }
    if (input === "r") {
      const loaded = loadAllMissions(repoRoot);
      setMissions(loaded);
      setStatusLine("refreshed");
      return;
    }
  };

  return (
    <Box flexDirection="column" paddingX={1}>
      {isRawModeSupported ? <InputHandler onKey={onKey} /> : null}
      <Header repoRoot={repoRoot} total={missions.length} interactive={!!isRawModeSupported} />
      <Box flexDirection="row" marginTop={1}>
        <MissionList missions={missions} selected={selected} />
        <Box flexDirection="column" marginLeft={2} flexGrow={1}>
          <DetailPane mission={current} repoRoot={repoRoot} diff={diff} />
        </Box>
      </Box>
      <Footer statusLine={statusLine} interactive={!!isRawModeSupported} />
    </Box>
  );
}

function InputHandler({
  onKey,
}: {
  onKey: (input: string, key: { upArrow: boolean; downArrow: boolean; tab: boolean; ctrl: boolean }) => void;
}) {
  useInput((input, key) => onKey(input, key));
  return null;
}

function Header({
  repoRoot,
  total,
  interactive,
}: {
  repoRoot: string;
  total: number;
  interactive: boolean;
}) {
  return (
    <Box flexDirection="row" justifyContent="space-between">
      <Text bold color="cyan">
        sheldon Mission Control{interactive ? "" : " [read-only]"}
      </Text>
      <Text dimColor>
        {total} mission{total === 1 ? "" : "s"} · {repoRoot}
      </Text>
    </Box>
  );
}

function MissionList({
  missions,
  selected,
}: {
  missions: LoadedMission[];
  selected: number;
}) {
  if (missions.length === 0) {
    return (
      <Box width={32} flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1}>
        <Text dimColor>no missions yet</Text>
        <Text dimColor>(run /sheldon:mission-new …)</Text>
      </Box>
    );
  }
  return (
    <Box width={32} flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1}>
      <Text bold>Missions</Text>
      {missions.map((m, i) => {
        const isSelected = i === selected;
        if (!("state" in m)) {
          return (
            <Text key={m.id} color={isSelected ? "white" : "red"}>
              {isSelected ? "▶ " : "  "}
              {shortId(m.id)} (malformed)
            </Text>
          );
        }
        const color = PHASE_COLORS[m.state.phase];
        return (
          <Box key={m.state.id} flexDirection="row">
            <Text color={isSelected ? "cyan" : undefined}>{isSelected ? "▶ " : "  "}</Text>
            <Box width={9}>
              <Text>{shortId(m.state.id)}</Text>
            </Box>
            <Box width={16}>
              <Text color={color}>{m.state.phase}</Text>
            </Box>
            <Text dimColor>{truncate(m.state.goal, 18)}</Text>
          </Box>
        );
      })}
    </Box>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function DetailPane({
  mission,
  repoRoot,
  diff,
}: {
  mission: LoadedMission | undefined;
  repoRoot: string;
  diff: string;
}) {
  if (!mission) {
    return <Text dimColor>(select a mission)</Text>;
  }
  if (!("state" in mission)) {
    return (
      <Box flexDirection="column">
        <Text color="red" bold>
          Malformed mission {mission.id}
        </Text>
        <Text>{mission.error}</Text>
      </Box>
    );
  }
  const s = mission.state;
  return (
    <Box flexDirection="column">
      <Box flexDirection="row">
        <Text bold>id: </Text>
        <Text>{s.id}</Text>
      </Box>
      <Box flexDirection="row">
        <Text bold>phase: </Text>
        <Text color={PHASE_COLORS[s.phase]}>{s.phase}</Text>
        <Text dimColor>   role: </Text>
        <Text>{s.current_role ?? "—"}</Text>
        <Text dimColor>   branch: </Text>
        <Text>{s.branch}</Text>
      </Box>
      <Box flexDirection="row">
        <Text bold>goal: </Text>
        <Text>{s.goal}</Text>
      </Box>
      <Box marginTop={1} flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1}>
        <Text bold>Contract</Text>
        <Text>{truncateLines(mission.contract, 14) || "(empty)"}</Text>
      </Box>
      <Box marginTop={1} flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1}>
        <Text bold>Handoffs ({s.handoffs.length})</Text>
        {s.handoffs.length === 0 ? (
          <Text dimColor>(none yet)</Text>
        ) : (
          s.handoffs.slice(-6).map((h, i) => (
            <Text key={i}>
              [{fmtTime(h.at)}] {h.from} → {h.to}
              {h.commit ? `  ${h.commit.slice(0, 7)}` : ""}
            </Text>
          ))
        )}
      </Box>
      <Box marginTop={1} flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1}>
        <Text bold>Validation runs ({s.validation_runs.length})</Text>
        {s.validation_runs.length === 0 ? (
          <Text dimColor>(none yet)</Text>
        ) : (
          s.validation_runs.slice(-3).map((v, i) => (
            <Text key={i} color={v.verdict === "pass" ? "green" : "red"}>
              [{fmtTime(v.at)}] {v.verdict.toUpperCase()}  {v.findings_path}
            </Text>
          ))
        )}
      </Box>
      <Box marginTop={1} flexDirection="column" borderStyle="round" borderColor="gray" paddingX={1}>
        <Text bold>Diff (since base_commit)</Text>
        <Text>{truncateLines(diff, 10) || "(loading…)"}</Text>
      </Box>
    </Box>
  );
}

function truncateLines(s: string, n: number): string {
  const lines = s.split("\n");
  if (lines.length <= n) return s;
  return lines.slice(0, n).join("\n") + "\n…";
}

function Footer({ statusLine, interactive }: { statusLine: string; interactive: boolean }) {
  return (
    <Box flexDirection="row" justifyContent="space-between" marginTop={1}>
      <Text dimColor>
        {interactive
          ? "↑↓/jk select · tab next · a copy /mission-approve · s copy /mission-status · r refresh · q quit"
          : "(non-TTY: read-only render. Run from a real terminal for keyboard input.)"}
      </Text>
      {statusLine ? <Text color="green">{statusLine}</Text> : null}
    </Box>
  );
}
