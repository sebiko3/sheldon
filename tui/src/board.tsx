import React from "react";
import { Box, Text } from "ink";
import type { LoadedMission } from "./missions.js";
import type { Epic } from "./epic-store.js";

interface MissionBoardProps {
  missions: LoadedMission[];
  epics: Epic[];
}

const COLUMNS = [
  { key: "proposed", label: "Proposed", color: "cyan" },
  { key: "planning", label: "Planning", color: "yellow" },
  { key: "implementing", label: "Implementing", color: "magenta" },
  { key: "validating", label: "Validating", color: "yellow" },
  { key: "done", label: "Done", color: "green" },
] as const;

type ColumnKey = (typeof COLUMNS)[number]["key"];

function shortId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id;
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function getColumnItems(
  col: ColumnKey,
  missions: LoadedMission[],
  epics: Epic[],
): { id: string; label: string; sub?: string }[] {
  if (col === "proposed") {
    const items: { id: string; label: string; sub?: string }[] = [];
    for (const epic of epics) {
      for (const issue of epic.issues) {
        if (issue.status === "proposed") {
          items.push({
            id: `${shortId(epic.id)}#${issue.id}`,
            label: issue.title,
            sub: truncate(epic.brief, 24),
          });
        }
      }
    }
    return items;
  }

  const phaseMap: Record<ColumnKey, string[]> = {
    proposed: [],
    planning: ["planning", "contract_review"],
    implementing: ["implementing", "handed_off", "rejected"],
    validating: ["validating", "validated"],
    done: ["done"],
  };

  const phases = phaseMap[col];
  return missions
    .filter((m) => "state" in m && phases.includes(m.state.phase))
    .map((m) => {
      if (!("state" in m)) return { id: m.id, label: "(malformed)" };
      return {
        id: shortId(m.state.id),
        label: truncate(m.state.goal, 28),
        sub: m.state.phase,
      };
    });
}

export function MissionBoard({ missions, epics }: MissionBoardProps) {
  return (
    <Box flexDirection="column">
      <Box flexDirection="row" marginBottom={1}>
        <Text bold color="cyan">
          Kanban Board
        </Text>
        <Text dimColor> (v to switch to list)</Text>
      </Box>
      <Box flexDirection="row" gap={1}>
        {COLUMNS.map((col) => {
          const items = getColumnItems(col.key, missions, epics);
          return (
            <Box
              key={col.key}
              flexDirection="column"
              borderStyle="round"
              borderColor={col.color}
              paddingX={1}
              width={32}
            >
              <Box flexDirection="row" justifyContent="space-between">
                <Text bold color={col.color}>
                  {col.label}
                </Text>
                <Text dimColor>{items.length}</Text>
              </Box>
              {items.length === 0 ? (
                <Text dimColor>—</Text>
              ) : (
                items.slice(0, 8).map((item, i) => (
                  <Box key={i} flexDirection="column" marginTop={i === 0 ? 1 : 0}>
                    <Text>{item.label}</Text>
                    {item.sub ? <Text dimColor>  {item.id} · {item.sub}</Text> : null}
                  </Box>
                ))
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
