import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import semver from 'semver'

/**
 * Нижние границы peer адаптера — версии фреймворка, на которых задача CI
 * «Минимальные версии» гоняет его спеки (docs/agents/build.md, «Версии
 * пакетов»). Без неё обещание в `peerDependencies` бралось на веру: CI ставил
 * только версии из lock, и пакет Angular обещал 21.1, а меню в нём работало
 * верно только с 22.1.6.
 *
 * Версии нигде не выписываются руками: список выводится из манифеста адаптера
 * и дерева зависимостей, иначе минимум в CI и в манифесте разошёлся бы. Дерево
 * называет сам npm (`npm query`), своего обхода `node_modules` здесь нет.
 */

/** Манифест как есть: поля не принимаются на веру, а проверяются по одному. */
export type TManifest = Readonly<Record<string, unknown>>

/** Копия пакета в дереве: где лежит и её манифест. */
export type TCopy = {
	/** Путь от корня репозитория: `node_modules/vue`, у воркспейса — `packages/ui/vue`. */
	readonly location: string
	readonly manifest: TManifest
}

/** Пакет и версия, которой его подменяют в дереве. */
export type TPin = {
	readonly name: string
	readonly version: string
}

/** Пакет из списка, которого нет в дереве нужной версией. */
export type TStray = {
	readonly name: string
	/** Версия из списка. */
	readonly expected: string
	/** Копия другой версии; нет — пакета в дереве нет вовсе. */
	readonly found?: { readonly version: string; readonly location: string }
}

function isObject(value: unknown): value is TManifest {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringField(manifest: TManifest, field: string): string | undefined {
	const value = manifest[field]

	return typeof value === 'string' ? value : undefined
}

/** Поле зависимостей манифеста: имя → диапазон. */
function specsIn(field: unknown): Map<string, string> {
	if (!isObject(field)) {
		return new Map()
	}

	return new Map(
		Object.entries(field).filter(
			(entry): entry is [string, string] => typeof entry[1] === 'string',
		),
	)
}

/**
 * Нижняя граница диапазона — версия `minVersion` из `semver`: `^22.2.0` →
 * `22.2.0`, у `^19.2.0 || ^18.3.1` — меньшая, `18.3.1`. Ошибка — диапазон без
 * нижней границы (`*`, `>=0.0.0`: версии `0.0.0` у фреймворка нет), диапазон,
 * которому не отвечает ни одна версия, и не диапазон вовсе
 * (`workspace:*`).
 */
export function lowerBound(range: string): string {
	const min = semver.validRange(range) === null ? null : semver.minVersion(range)

	if (min === null || min.version === '0.0.0') {
		throw new Error(`диапазон «${range}»: нижней границы нет`)
	}

	return min.version
}

/** Рёбра копии, которые держат пакет её версией ровно: `@vue/shared: 3.5.44` у `vue@3.5.44`. */
function exactPinsOf({ manifest }: TCopy): string[] {
	const version = stringField(manifest, 'version')
	const edges = [
		...specsIn(manifest.dependencies),
		...specsIn(manifest.optionalDependencies),
		...specsIn(manifest.peerDependencies),
	]

	return edges.filter(([, spec]) => spec === version).map(([name]) => name)
}

/**
 * Что подменяется для прогона адаптера на нижних границах peer:
 *
 * - каждый peer — нижней границей своего диапазона;
 * - `devDependency` адаптера с тем же диапазоном, что у одного из peer, — его
 *   нижней границей: так вместе с `@angular/core` идут `@angular/compiler`,
 *   `compiler-cli`, `animations` и `platform-server`, которым Angular велит
 *   версию ядра, а `@angular/build`, `@angular/cli` и `ng-packagr` остаются из
 *   lock;
 * - пакеты выпуска: зависимость или peer, который пакет из списка держит
 *   ровно своей версией в дереве, — той же версией, что он сам, и вглубь. Так
 *   с `vue` идут `@vue/runtime-dom`, `@vue/compiler-sfc`, `@vue/server-renderer`
 *   и остальные `@vue/*`: фреймворк выпускает их одним номером, а копия
 *   другого номера — тот же фреймворк другой версии, и её взяли бы
 *   инструменты тестов (`@vue/test-utils` берёт `@vue/server-renderer` и
 *   `@vue/compiler-dom` сам, мимо `vue`).
 *
 * Пакет, которому правила дают две разные версии, — ошибка: такой список
 * подменить нельзя. Список отсортирован по имени.
 */
export function pinsOf(manifest: TManifest, tree: readonly TCopy[]): TPin[] {
	const pins = new Map<string, string>()

	const add = (name: string, version: string, reason: string): void => {
		const pinned = pins.get(name)

		if (pinned !== undefined && pinned !== version) {
			throw new Error(`${name}: две нижние границы — ${pinned} и ${version} (${reason})`)
		}

		pins.set(name, version)
	}

	const peers = specsIn(manifest.peerDependencies)
	const peerRanges = new Set(peers.values())

	for (const [name, range] of peers) {
		add(name, lowerBound(range), `peer «${range}»`)
	}

	for (const [name, range] of specsIn(manifest.devDependencies)) {
		if (!peers.has(name) && peerRanges.has(range)) {
			add(name, lowerBound(range), `devDependency «${range}»`)
		}
	}

	const visited = new Set(pins.keys())

	const walk = (name: string, version: string): void => {
		for (const copy of tree.filter(({ manifest }) => manifest.name === name)) {
			for (const member of exactPinsOf(copy)) {
				add(member, version, `пакет выпуска ${name}`)

				if (!visited.has(member)) {
					visited.add(member)
					walk(member, version)
				}
			}
		}
	}

	for (const [name, version] of [...pins]) {
		walk(name, version)
	}

	return [...pins]
		.map(([name, version]) => ({ name, version }))
		.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Пакеты списка, которых нет в дереве нужной версией: каждая копия другой
 * версии, где бы она ни лежала, и пакет, которого в дереве нет вовсе. Копию
 * другой версии взяли бы спеки или инструменты тестов, и прогон был бы
 * зелёным впустую.
 */
export function strayCopies(pins: readonly TPin[], tree: readonly TCopy[]): TStray[] {
	return pins.flatMap(({ name, version: expected }): TStray[] => {
		const copies = tree.filter(({ manifest }) => manifest.name === name)

		if (copies.length === 0) {
			return [{ name, expected }]
		}

		return copies
			.map(({ location, manifest }) => ({
				version: stringField(manifest, 'version') ?? '',
				location,
			}))
			.filter(({ version }) => version !== expected)
			.map((found) => ({ name, expected, found }))
	})
}

/** Число копий пакета в дереве. */
export function copiesOf(name: string, tree: readonly TCopy[]): number {
	return tree.filter(({ manifest }) => manifest.name === name).length
}

/**
 * Манифест воркспейса по имени — из того же дерева: воркспейс лежит вне
 * `node_modules`.
 */
export function workspaceOf(name: string, tree: readonly TCopy[]): TManifest {
	const found = tree.find(
		({ location, manifest }) =>
			manifest.name === name && !location.split('/').includes('node_modules'),
	)

	if (found === undefined) {
		throw new Error(`воркспейса ${name} в дереве нет`)
	}

	return found.manifest
}

/**
 * Дерево зависимостей в каталоге `root`, как его видит npm: каждая копия
 * каждого пакета, вложенные и воркспейсы тоже. `npm query` отдаёт манифест
 * копии вместе с её местом (`location`). Копия без имени или версии в счёт не
 * идёт: в списке подмены таких нет.
 *
 * npm — через оболочку: на Windows это `npm.cmd`, а пакетный файл Node без
 * оболочки не запускает (EINVAL).
 */
export function readTree(root: string): TCopy[] {
	const output = execSync('npm query "*"', {
		cwd: root,
		encoding: 'utf-8',
		maxBuffer: 64 * 1024 * 1024,
		stdio: ['ignore', 'pipe', 'pipe'],
	})
	const listed: unknown = JSON.parse(output)

	if (!Array.isArray(listed)) {
		throw new Error('npm query: ожидается массив пакетов')
	}

	return listed.flatMap((entry: unknown): TCopy[] => {
		if (!isObject(entry) || typeof entry.location !== 'string') {
			throw new Error('npm query: пакет без location')
		}

		const named = stringField(entry, 'name') !== undefined
		const versioned = stringField(entry, 'version') !== undefined

		return named && versioned ? [{ location: entry.location, manifest: entry }] : []
	})
}

/**
 * Каталог копии в корне: манифест и lock корня, какими они были до подмены.
 * Лежит вне `node_modules` — там дерево переставляет npm, а `npm ci` сносит
 * его целиком, — и стоит в `.gitignore`.
 */
export const SAVED_DIR = '.min-peers'

/** Файлы корня, которые правит подмена. */
const ROOT_FILES = ['package.json', 'package-lock.json']

/**
 * Сохраняет манифест и lock корня `root` в каталог копии — до подмены, чтобы
 * вернуть их `restoreRoot`. Копия уже есть — ошибка: прошлая подмена не
 * возвращена, и новая копия затёрла бы оригинал подменёнными файлами. Оба
 * файла читаются до того, как заведён каталог: без одного из них копии нет
 * вовсе, а не половина.
 */
export function saveRoot(root: string): void {
	const saved = join(root, SAVED_DIR)

	if (existsSync(saved)) {
		throw new Error(`${saved}: копия уже есть — прошлая подмена не возвращена (restore)`)
	}

	const files = ROOT_FILES.map((file) => ({ file, content: readFileSync(join(root, file)) }))

	mkdirSync(saved)

	for (const { file, content } of files) {
		writeFileSync(join(saved, file), content)
	}
}

/**
 * Возвращает манифест и lock корня `root` из каталога копии, байт в байт, и
 * убирает копию. Копии нет — ошибка, и файлы корня не тронуты. Не версия из
 * `HEAD`: она стёрла бы и незакоммиченную правку, с которой граница
 * поднимается. npm здесь не зовётся — дерево к возвращённым файлам приводит
 * `npm install` из `cli.ts`.
 */
export function restoreRoot(root: string): void {
	const saved = join(root, SAVED_DIR)

	if (!existsSync(saved)) {
		throw new Error(`${saved}: копии нет — возвращать нечего`)
	}

	const files = ROOT_FILES.map((file) => ({ file, content: readFileSync(join(saved, file)) }))

	for (const { file, content } of files) {
		writeFileSync(join(root, file), content)
	}

	rmSync(saved, { recursive: true })
}

/**
 * Подменяет пакеты списка во всём дереве каталога `root`: пишет их в
 * `overrides` манифеста корня и разрешает заново. Правит манифест корня, lock
 * и `node_modules` — это для раннера CI, в репозиторий подмена не попадает.
 * До правки сохраняет манифест и lock (`saveRoot`), и локально их возвращает
 * `restoreRoot`; копия, оставшаяся от прошлой подмены, роняет новую до правки.
 *
 * Разрешает их `npm update` по именам, а не `npm install`: тот новые
 * `overrides` в дереве из lock применяет не везде, и копия, которую lock уже
 * держит, остаётся прежней версии. Overrides корня до зависимостей воркспейсов
 * доносит только npm 11: у npm 10 копия из `devDependencies` адаптера остаётся
 * версией lock. Оба случая ловит `strayCopies`.
 */
export function pinTree(root: string, pins: readonly TPin[]): void {
	const path = join(root, 'package.json')
	const parsed: unknown = JSON.parse(readFileSync(path, 'utf-8'))

	if (!isObject(parsed)) {
		throw new Error(`${path}: ожидается объект JSON`)
	}

	const overrides = {
		...(isObject(parsed.overrides) ? parsed.overrides : {}),
		...Object.fromEntries(pins.map(({ name, version }) => [name, version])),
	}

	saveRoot(root)
	writeFileSync(path, `${JSON.stringify({ ...parsed, overrides }, null, 2)}\n`)
	execSync(`npm update ${pins.map(({ name }) => name).join(' ')} --no-audit --no-fund`, {
		cwd: root,
		stdio: 'inherit',
	})
}
