import { execSync } from 'node:child_process'
import { resolve } from 'node:path'
import {
	copiesOf,
	pinsOf,
	pinTree,
	readTree,
	restoreRoot,
	strayCopies,
	workspaceOf,
} from './min-peers.ts'
import type { TStray } from './min-peers.ts'

/**
 * Задача CI «Минимальные версии» (docs/agents/build.md, «Версии пакетов»):
 * спеки адаптера на нижних границах его peer.
 *
 * ```bash
 * node tools/min-peers/cli.ts list @soldy-ui/vue    # что подменяется: пакет@версия
 * node tools/min-peers/cli.ts pin @soldy-ui/vue     # подменить во всём дереве
 * node tools/min-peers/cli.ts verify @soldy-ui/vue  # все копии — версии списка
 * node tools/min-peers/cli.ts restore               # вернуть манифест и lock, дерево — по ним
 * ```
 *
 * Запускается Node из корня, без сборки: типы Node снимает сам. `pin` правит
 * манифест корня, lock и `node_modules` — это для раннера CI, — а до правки
 * сохраняет копию обоих файлов. Локально их возвращает `restore`: из копии, а
 * не из `HEAD`, и дерево приводит к возвращённому lock.
 */

const ROOT = resolve(import.meta.dirname, '../..')

const USAGE = [
	'node tools/min-peers/cli.ts list|pin|verify <воркспейс>',
	'node tools/min-peers/cli.ts restore',
].join('\n')

function describeStray({ name, expected, found }: TStray): string {
	return found === undefined
		? `${name}: в дереве нет, а нужна ${expected}`
		: `${name}: ${found.version} в ${found.location}, а нужна ${expected}`
}

function run(command: string | undefined, workspace: string | undefined): number {
	if (command === 'restore' && workspace === undefined) {
		restoreRoot(ROOT)
		// Дерево — `npm install`, а не `npm ci`: тот сначала сносит весь
		// `node_modules`, и на Windows его на полпути роняет нативный модуль,
		// который держит другой процесс, — языковой сервер редактора, dev-сервер
		// стенда, — а дерево остаётся снесённым наполовину. `npm install` меняет
		// только пакеты, разошедшиеся с lock, а lock, сошедшийся с манифестами,
		// не переписывает.
		execSync('npm install --no-audit --no-fund', { cwd: ROOT, stdio: 'inherit' })
		return 0
	}

	if (workspace === undefined || !['list', 'pin', 'verify'].includes(command ?? '')) {
		console.error(USAGE)
		return 2
	}

	const tree = readTree(ROOT)
	const pins = pinsOf(workspaceOf(workspace, tree), tree)

	if (pins.length === 0) {
		console.error(`${workspace}: peerDependencies нет — проверять нечего`)
		return 1
	}

	if (command === 'list') {
		console.log(pins.map(({ name, version }) => `${name}@${version}`).join('\n'))
		return 0
	}

	if (command === 'pin') {
		console.log(pins.map(({ name, version }) => `${name}@${version}`).join('\n'))
		pinTree(ROOT, pins)
		return 0
	}

	const stray = strayCopies(pins, tree)

	for (const { name, version } of pins) {
		console.log(`${name}@${version}: копий в дереве — ${copiesOf(name, tree)}`)
	}

	if (stray.length > 0) {
		console.error(stray.map(describeStray).join('\n'))
		return 1
	}

	return 0
}

process.exitCode = run(process.argv[2], process.argv[3])
