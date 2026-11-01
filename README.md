# continuous-release/.github

The org profile and the shared release workflow.

## `auto-release.yml`

A reusable workflow (`workflow_call`) that owns the release contract. Callers
supply the build-system adapter and their setup, test, build, and publish
commands; the workflow reserves the version, runs those commands, and creates
the GitHub Release.

Inputs:

| Input | Purpose |
| --- | --- |
| `system` | `node`, `nx`, `bazel`, `nix`, `buck2`, `rust`, or `none` |
| `toolkit-ref` | Toolkit release to install (default `v0.3.1`) |
| `working-directory` | Directory containing the project |
| `setup-command` | Dependency install, run before tests |
| `test-command` | Tests, run before the build |
| `build-command` | Produces the release artifacts |
| `publish-command` | Optional registry publish, run after the build |
| `artifact-glob` | Files attached to the release |
| `runs-on` | Runner label |

The workflow installs the pinned `cr` binary from
[`continuous-release/toolkit`](https://github.com/continuous-release/toolkit)
and runs:

1. **Reserve** — create `vX.Y.Z` at the pushed commit. The tag is the lock.
2. **Setup, test, build** — with `VERSION` set to the reserved version.
3. **Publish** — always attempted for a reserved version; publish commands
   must be idempotent.
4. **Release** — create a draft, upload assets, then promote it.
5. **Verify** — check that the release is published and, when artifacts are
   configured, that it has assets.
6. **Drop the reservation** — on a failure before the build completes, remove
   the tag so the version can be reused.

If a concurrent run took the same version, `reserve` fetches the winning tag
and re-plans; if the winning release already contains this commit, it reports
`superseded` and the rest of the job is skipped.

Outputs:

| Output | Purpose |
| --- | --- |
| `version` | The released (or existing) version |
| `tag` | The released tag |
| `release_url` | URL of the created or updated release |

Callers can use these in a follow-up job, for example to download the published
assets, check the checksum, and run the binary.

## Callers

```yaml
jobs:
  release:
    uses: continuous-release/.github/.github/workflows/auto-release.yml@main
    with:
      system: rust
      build-command: cargo build --release --locked
      artifact-glob: target/release/my-cli
```

The caller must grant `contents: write` (and `packages: write` for the current
reusable workflow's declared permissions).
