// Заметки GitHub Release для выпуска группы `fixed` (см. .github/workflows/release.yml).
//
// Раздел версии у пакетов группы разный: changeset пишет пункт только
// названным в нём пакетам, остальным — «No changes in this release.» или одни
// строки поднятых зависимостей. Поэтому:
// - пакет без своих пунктов в заметки не попадает;
// - пунктов мало — они в самих заметках, один раз каждый, с пакетами, где он
//   записан (общий changeset пишется в CHANGELOG каждого своего пакета);
// - пунктов много — ссылки на CHANGELOG пакетов с пунктами на коммите выпуска
//   (тег `пакет@версия` GitHub в ссылке на файл не разбирает).
//
// node tools/release-notes/release-notes.mjs <версия> <база ссылок> > notes.md

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

// Больше пунктов — заметки ссылками
const INLINE_LIMIT = 15

const [version, linkBase] = process.argv.slice(2)
if (!version || !linkBase) {
	console.error('usage: release-notes.mjs <version> <link base>')
	process.exit(1)
}

// Раздел `## <версия>`: пункты changeset — `- <хеш>: текст` с продолжением
// отступом; строки зависимостей (`- @soldy-ui/x@…`, `- Updated dependencies`)
// изменений пакета не несут.
function entriesOf(changelog) {
	const lines = changelog.split(/\r?\n/)
	const start = lines.indexOf(`## ${version}`)
	if (start < 0) return []
	const entries = []
	let kind = ''
	let current = null
	for (const line of lines.slice(start + 1)) {
		if (line.startsWith('## ')) break
		const heading = /^### (.+)$/.exec(line)
		if (heading) {
			kind = heading[1]
			current = null
			continue
		}
		const item = /^- [0-9a-f]{7,}: (.*)$/.exec(line)
		if (item) {
			current = { kind, text: item[1] }
			entries.push(current)
		} else if (line.startsWith('- ')) {
			current = null
		} else if (current && /^\s+\S/.test(line)) {
			current.text += '\n' + line
		}
	}
	return entries
}

const files = execFileSync('git', ['ls-files', 'packages/**/CHANGELOG.md'], { encoding: 'utf8' })
	.split('\n')
	.filter(Boolean)

const changed = []
for (const file of files) {
	const entries = entriesOf(readFileSync(file, 'utf8'))
	if (entries.length === 0) continue
	const { name } = JSON.parse(readFileSync(join(dirname(file), 'package.json'), 'utf8'))
	changed.push({ name, file, entries })
}

// Один changeset на несколько пакетов — один пункт
const unique = new Map()
for (const { name, entries } of changed) {
	for (const { kind, text } of entries) {
		const key = `${kind}\n${text}`
		const entry = unique.get(key) ?? { kind, text, packages: [] }
		entry.packages.push(name)
		unique.set(key, entry)
	}
}

const out = []
if (unique.size === 0) {
	out.push('Изменений в пакетах нет.')
} else if (unique.size <= INLINE_LIMIT) {
	for (const kind of ['Major Changes', 'Minor Changes', 'Patch Changes']) {
		const items = [...unique.values()].filter((e) => e.kind === kind)
		if (items.length === 0) continue
		out.push(`### ${kind}`, '')
		for (const { text, packages } of items) {
			out.push(`- ${text} (${packages.map((p) => `\`${p}\``).join(', ')})`)
		}
		out.push('')
	}
} else {
	out.push('Что изменилось — в CHANGELOG пакетов:', '')
	for (const { name, file } of changed) out.push(`- [${name}](${linkBase}/${file})`)
}

process.stdout.write(out.join('\n').trimEnd() + '\n')
