/**
 * Состояние пула worktree для `/drive`: какие папки заняты, какие свободны.
 * Правила те же, что у `/drive` (`.claude/commands/drive.md`, «Замки» и
 * «Папка пула»): пул — worktree `soldy-*` рядом с основным репозиторием,
 * кроме `soldy-conflicts` (папка конфликтов в PR, AGENTS.md, «Рабочие папки»),
 * замок папки — `<git>/agent-locks/<папка>` с файлом `task`.
 *
 * Только читает: замков не берёт и не снимает.
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()

const locks = join(resolve(git('rev-parse', '--git-common-dir')), 'agent-locks')

const worktrees = git('worktree', 'list', '--porcelain')
	.split(/\r?\n\r?\n/)
	.filter(Boolean)
	.map((block) => {
		const path = /^worktree (.+)$/m.exec(block)[1]
		const branch = /^branch refs\/heads\/(.+)$/m.exec(block)?.[1] ?? '(detached)'

		return { path, branch }
	})

const [main] = worktrees
const prefix = `${basename(main.path)}-`
const conflicts = `${prefix}conflicts`
const pool = worktrees
	.slice(1)
	.filter(
		(w) =>
			dirname(w.path) === dirname(main.path) &&
			basename(w.path).startsWith(prefix) &&
			basename(w.path) !== conflicts,
	)

const rows = pool.map(({ path, branch }) => {
	const name = basename(path)
	const lock = join(locks, name)
	const task = existsSync(join(lock, 'task'))
		? readFileSync(join(lock, 'task'), 'utf8').trim()
		: null
	const dirty = git('-C', path, 'status', '--porcelain') !== ''

	let state

	if (existsSync(lock)) {
		state = `занята ${task ?? '(замок без task)'}`
	} else if (dirty) {
		state = 'грязная — /drive её не возьмёт, разобрать руками'
	} else {
		state = 'свободна'
	}

	return { name, state, branch, task, free: !existsSync(lock) && !dirty }
})

const inFolders = new Set(rows.map((r) => r.task))
const tasks = existsSync(locks)
	? readdirSync(locks)
			.filter((entry) => entry.startsWith('task-'))
			.map((entry) => entry.slice('task-'.length))
	: []
const withoutFolder = tasks.filter((id) => !inFolders.has(id))

const width = Math.max(...rows.map((r) => r.name.length))
const stateWidth = Math.max(...rows.map((r) => r.state.length))

for (const r of rows) {
	console.log(`${r.name.padEnd(width)}  ${r.state.padEnd(stateWidth)}  ${r.branch}`)
}

const free = rows.filter((r) => r.free).length

console.log('')
console.log(`Свободно ${free} из ${rows.length}.`)

if (withoutFolder.length) {
	console.log(
		`Задачи /drive без папки (анализ, планирование, ревью): ${withoutFolder.join(', ')}.`,
	)
}
