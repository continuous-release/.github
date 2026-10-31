# continuous-release

**Release on commit, not release PRs.** Every commit that lands on `main` cuts
a release.

This org is two things at once:

- a **testbed** for build systems under one release contract, so Nx, Bazel,
  Nix, and Buck2 can be compared on the same terms;
- a home for the **releaser tools** that implement that contract.

## Testbeds

| Repo    | Build system | Fixture             | Release artifact |
| ------- | ------------ | ------------------- | ---------------- |
| [nx]    | Nx + pnpm    | TypeScript library  | npm tarballs     |
| [bazel] | Bazel        | Rust binary         | zip              |
| [nix]   | Nix flakes   | Rust CLI            | tarball          |
| [buck2] | Buck2        | Rust CLI            | tarball          |

[nx]: https://github.com/continuous-release/nx
[bazel]: https://github.com/continuous-release/bazel
[nix]: https://github.com/continuous-release/nix
[buck2]: https://github.com/continuous-release/buck2

## The contract

- A push to `main` computes the next version from conventional commits since
  the last `v*` tag.
- `feat` bumps minor, `BREAKING CHANGE` or `type!` bumps major, everything else
  bumps patch. No previous tag starts at `0.1.0`.
- The version is injected into the build. Nothing is committed back to `main`;
  tags are the source of truth, so the release cannot trigger itself.
- The run tags `vX.Y.Z` and creates a GitHub Release with grouped notes and
  the build artifacts attached.
- Pull requests build and test, but never release.

The shared implementation lives in
[`continuous-release/.github`](https://github.com/continuous-release/.github).

## Why

Release PRs are the default in most ecosystems, but they hide the cost of a
release behind a second review. Release-on-commit makes every merge the
release event, which is a much harsher test of a build system: version
derivation, affected builds, caching, packaging, and publishing all have to be
correct on every commit.

The testbeds exist to find out which build systems make that cheap.
