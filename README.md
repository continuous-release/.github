# continuous-release/.github

Org profile and the shared release harness for the
[continuous-release](https://github.com/continuous-release) testbeds.

## `auto-release.yml`

A reusable workflow (`workflow_call`) that implements the release-on-commit
contract. A caller supplies the toolchain (`system`) and its build commands;
the workflow owns versioning, tagging, notes, and the GitHub Release.

```yaml
name: release

on:
  push:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: release-${{ github.repository }}
  cancel-in-progress: false

permissions:
  contents: write
  packages: write
  id-token: write
  attestations: write

jobs:
  release:
    uses: continuous-release/.github/.github/workflows/auto-release.yml@main
    with:
      system: nix
      test-command: nix flake check --print-build-logs
      build-command: |
        echo "$VERSION" > version.txt
        git add -f version.txt
        nix build .#default --print-build-logs
        mkdir -p dist
        cp -L result/bin/example dist/
        tar -C dist -czf "dist/example-$VERSION-x86_64-linux.tar.gz" example
      artifact-glob: dist/*.tar.gz
```

### Inputs

| Input             | Required | Default             | Meaning                                              |
| ----------------- | -------- | ------------------- | ---------------------------------------------------- |
| `system`          | yes      | —                   | Toolchain adapter: `nx`, `bazel`, `nix`, or `buck2`  |
| `build-command`   | yes      | —                   | Produces the artifacts                               |
| `setup-command`   | no       | `''`                | Runs before tests (e.g. `pnpm install`)              |
| `test-command`    | no       | `''`                | Runs before the build                                |
| `publish-command` | no       | `''`                | Runs after a successful build (e.g. npm publish)     |
| `artifact-glob`   | no       | `''`                | Files attached to the release                        |
| `artifact-name`   | no       | `release-artifacts` | Intermediate artifact name                           |
| `runs-on`         | no       | `ubuntu-latest`     | Runner label                                         |

`VERSION` is set for `setup-command`, `test-command`, `build-command`, and
`publish-command`. For `nx`, the workflow also writes an `.npmrc` for the
`@continuous-release` scope before `publish-command`.

### Version rules

`scripts/next-version.mjs`:

- no previous `v*` tag → `0.1.0`
- `feat` → minor
- `BREAKING CHANGE` footer or `type!` → major
- anything else → patch
- `Release-As: X.Y.Z` footer → that version
- `HEAD` already tagged `v*` → reuse the tag (idempotent re-runs)

`scripts/release-notes.mjs` groups the same commits by conventional type and
adds a compare link when there is a previous tag.

## Adding a testbed

1. Create the repo under `continuous-release`.
2. Add `.github/workflows/release.yml` with a `workflow_call` to this workflow.
3. Make the build read `VERSION` and write artifacts to `dist/`.
4. Push to `main` and check the first release.

No version-bump commits, no changelog commits, no release branches.
