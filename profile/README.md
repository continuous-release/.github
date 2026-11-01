# continuous-release

**Release on commit, not release PRs.** Every commit that lands on `main` cuts
a release.

The org builds the tools that implement that contract and the testbeds that
hold them to it.

## Components

| Repo | Purpose |
| --- | --- |
| [toolkit] | Rust `cr` binary: version derivation, notes, adapters, tag reservation, GitHub Releases |
| [fake-github] | In-memory GitHub API server used as a test double by the toolkit and harness |
| [.github] | The shared `auto-release` reusable workflow every repo calls |
| [harness] | Rust harness: local contract suite plus sharded live GitHub Actions scenarios |
| [sandbox] | Disposable target the harness resets to its `base` tag |
| [polyglot] | L2 fixture: one contract, Rust + TypeScript + Python artifacts, four adapters (Nx, Bazel, Nix, Buck2) |
| [nx] | Nx + pnpm testbed |
| [bazel] | Bazel testbed |
| [nix] | Nix flakes testbed |
| [buck2] | Buck2 testbed |

[toolkit]: https://github.com/continuous-release/toolkit
[fake-github]: https://github.com/continuous-release/fake-github
[.github]: https://github.com/continuous-release/.github
[harness]: https://github.com/continuous-release/harness
[sandbox]: https://github.com/continuous-release/sandbox
[polyglot]: https://github.com/continuous-release/polyglot
[nx]: https://github.com/continuous-release/nx
[bazel]: https://github.com/continuous-release/bazel
[nix]: https://github.com/continuous-release/nix
[buck2]: https://github.com/continuous-release/buck2

## The contract

- A push to `main` computes the next version from conventional commits since
  the last `v*` tag.
- `feat` bumps minor, `BREAKING CHANGE` or `type!` bumps major, everything else
  bumps patch. No previous tag starts at `0.1.0`. `Release-As` forces a version.
- The version is injected into the build. Nothing is committed back to `main`;
  tags are the source of truth, so the release cannot trigger itself.
- The tag is **reserved before build and publish**. A re-run continues the same
  release, a concurrent run re-plans from the winning tag or reports that it was
  superseded, and a failure before the build drops the reservation.
- Releases are created as drafts, get their assets, then are promoted, so a
  half-uploaded release is never visible.
- Pull requests build and test, but never release.

## Why

Release PRs are the default in most ecosystems, but they hide the cost of a
release behind a second review. Release-on-commit makes every merge the release
event, which is a much harsher test of a build system: version derivation,
affected builds, caching, packaging, and publishing all have to be correct on
every commit.

The testbeds exist to find out which build systems make that cheap. The
harness runs the same scenarios locally for fast feedback and live against
real GitHub Actions for fidelity, so the contract is measured rather than
assumed.
