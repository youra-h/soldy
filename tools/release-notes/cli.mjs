// Release steps of .github/workflows/release.yml (docs/agents/build.md,
// «Версии пакетов»):
//
//   node tools/release-notes/cli.mjs unpublished         # name@version of every package npm does not have yet
//   node tools/release-notes/cli.mjs notes <links>       # notes for name@version lines from stdin
//   node tools/release-notes/cli.mjs release <links> <sha>  # the GitHub Release for them
//
// `<links>` is the base of links to files at the release commit,
// `https://github.com/<owner>/<repo>/blob/<sha>`. `notes` previews on a release
// branch what `release` will publish: `unpublished` lists what the branch bumped.

import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import {
	notesOf,
	npmPackages,
	parseSpec,
	releaseOf,
	sharedVersion,
	unpublishedOf,
	withChangelogs,
} from './release-notes.mjs'

const ROOT = resolve(import.meta.dirname, '../..')

const USAGE = [
	'node tools/release-notes/cli.mjs unpublished',
	'node tools/release-notes/cli.mjs notes <links>',
	'node tools/release-notes/cli.mjs release <links> <sha>',
].join('\n')

/**
 * The version npm has for `name@version`, or `undefined` — npm answers a
 * missing one with E404. One command line through the shell: on Windows npm
 * is a `.cmd` script, and only a shell runs it.
 */
function view(spec) {
	const { status, stdout } = spawnSync(`npm view ${spec} version`, {
		encoding: 'utf8',
		shell: true,
	})

	return status === 0 ? stdout.trim() : undefined
}

/**
 * The published packages from stdin, one `name@version` per line, each found
 * among the packages that go to npm at the version of its manifest.
 */
function readPublished() {
	const known = new Map(npmPackages(ROOT).map((pkg) => [pkg.name, pkg]))

	return readFileSync(0, 'utf8')
		.split(/\r?\n/)
		.filter((line) => line.trim() !== '')
		.map((line) => {
			const { name, version } = parseSpec(line.trim())
			const pkg = known.get(name)

			if (pkg === undefined || pkg.version !== version) {
				throw new Error(`${line}: no package going to npm at this version`)
			}

			return pkg
		})
}

function run(command, args) {
	if (command === 'unpublished' && args.length === 0) {
		for (const { name, version } of unpublishedOf(npmPackages(ROOT), view)) {
			console.log(`${name}@${version}`)
		}

		return 0
	}

	if (
		(command === 'notes' && args.length === 1) ||
		(command === 'release' && args.length === 2)
	) {
		const [links, sha] = args
		const published = readPublished()
		const shared = sharedVersion(ROOT)
		const notes = notesOf(withChangelogs(ROOT, published), shared, links)

		if (command === 'notes') {
			process.stdout.write(notes)
			return 0
		}

		const { tag, title } = releaseOf(published, shared)
		const { status } = spawnSync(
			'gh',
			['release', 'create', tag, '--title', title, '--target', sha, '--notes-file', '-'],
			{ input: notes, stdio: ['pipe', 'inherit', 'inherit'] },
		)

		return status ?? 1
	}

	console.error(USAGE)
	return 2
}

process.exitCode = run(process.argv[2], process.argv.slice(3))
