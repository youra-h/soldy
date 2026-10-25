// Текст changeset'а уходит в CHANGELOG.md пакета как есть, а CHANGELOG пишется
// по-английски (docs/agents/build.md, «Версии пакетов»). Ждущие выпуска
// changeset'ы — `.changeset/*.md` кроме README; использованные выпуск уже
// унёс в `.changeset/pre/`, их не смотрим.
//
// node tools/changeset-language/check.mjs

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
