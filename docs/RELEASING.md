# Releasing

1. Bump the version string in all three manifests: `package.json` (root), `mcp/missions-server/package.json`, and `.claude-plugin/plugin.json`.
2. Update `CHANGELOG.md`: move items from `## [Unreleased]` into a new dated section, e.g. `## [1.0.0] - YYYY-MM-DD`.
3. Commit the version bump and changelog update: `git commit -m "chore: release v<version>"`.
4. Create an annotated git tag: `git tag -a v<version> -m "Release v<version>"`.
5. Push with tags: `git push --follow-tags`.
6. Optionally create a GitHub release from the tag (copy the CHANGELOG section as release notes).

Note: this process can later be automated via release-please but is intentionally manual for now.
