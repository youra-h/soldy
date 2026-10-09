# Security policy

## Supported versions

Soldy UI is in early development (`0.x`). All `@soldy-ui/*` packages share one version, and only
the latest release receives security fixes.

| Version        | Supported |
| -------------- | --------- |
| latest `0.x`   | yes       |
| older releases | no        |

## Reporting a vulnerability

**Please do not report security vulnerabilities in public issues, pull requests or discussions.**

Report them privately through GitHub:
[open a private vulnerability report](https://github.com/youra-h/soldy/security/advisories/new)
(the **Security** tab → **Report a vulnerability**). The report is visible only to the maintainers.

Please include:

- the affected packages and version;
- a description of the issue and its impact;
- steps or a minimal example to reproduce it;
- a suggested fix, if you have one.

## What to expect

- an acknowledgement within 7 days;
- an assessment and, if the report is confirmed, a plan for the fix;
- a fix released as a new version, with a GitHub security advisory that credits you, unless you
  prefer to stay anonymous.

Please give us a reasonable time to release the fix before disclosing the issue publicly.

## Scope

In scope: the published `@soldy-ui/*` packages — the core, plugins, setup, framework adapters,
themes and icon packs.

Out of scope: the playground and the tools in `tools/`, which are not published, and
vulnerabilities in third-party dependencies that are not exploitable through Soldy UI (report
those upstream).
