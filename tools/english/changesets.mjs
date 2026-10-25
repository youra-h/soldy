// A changeset's text goes into the package CHANGELOG.md as is, and CHANGELOG
// is written in English (AGENTS.md, «Комментарии, коммиты и CHANGELOG — на
// английском»). Checks the changesets waiting for a release — `.changeset/*.md`
// except README; the release has already moved used ones to `.changeset/pre/`.
//
// node tools/english/changesets.mjs

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = '.changeset'
const cyrillic = /[Ѐ-ӿ]/

const offenders = readdirSync(dir)
	.filter((name) => name.endsWith('.md') && name !== 'README.md')
	.filter((name) => cyrillic.test(readFileSync(join(dir, name), 'utf8')))

if (offenders.length > 0) {
	console.error('Changeset text goes to CHANGELOG.md as is and must be in English:')
	for (const name of offenders) console.error(`  ${dir}/${name}`)
	process.exit(1)
}
