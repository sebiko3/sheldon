#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { App } from "./ui.js";

function parseArgs(argv: string[]): { repo: string; help: boolean } {
  let repo = process.cwd();
  let help = false;
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") {
      help = true;
    } else if (a === "--repo" || a === "-r") {
      const next = argv[i + 1];
      if (!next) {
        process.stderr.write("--repo requires a path argument\n");
        process.exit(2);
      }
      repo = path.resolve(next);
      i++;
    } else if (a && !a.startsWith("-")) {
      // Positional: treat as repo path
      repo = path.resolve(a);
    }
  }
  return { repo, help };
}

const { repo, help } = parseArgs(process.argv);

if (help) {
  process.stdout.write(
    `sheldon-tui — Mission Control terminal UI

Usage:
  sheldon-tui [path]
  sheldon-tui --repo <path>

Watches <path>/.missions/ and renders an Ink-based dashboard of all missions.
Defaults to the current working directory.

Keys:
  ↑↓ / jk    select mission
  tab        next mission
  a          copy '/sheldon:mission-approve <id>' to clipboard
  s          copy '/sheldon:mission-status <id>' to clipboard
  r          force refresh
  q / ^C     quit
`,
  );
  process.exit(0);
}

if (!existsSync(repo) || !statSync(repo).isDirectory()) {
  process.stderr.write(`sheldon-tui: ${repo} is not a directory\n`);
  process.exit(1);
}

render(<App repoRoot={repo} />);
