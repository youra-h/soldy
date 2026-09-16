import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { readChangesets } from '@changesets/read'

/**
 * Сторож раздела «Версии пакетов» (см. AGENTS.md). Версии ведёт changesets:
 * библиотечные пакеты `@soldy/*` — одна группа `fixed` и потому одна версия,
 * стенд — в `ignore`. Библиотечный пакет несёт метаданные: описание, лицензию и
 * путь в репозитории.
 *
 * Список пакетов не хардкодится: он раскрывается из `workspaces` корневого
 * манифеста, поэтому новый пакет попадает под проверку сам. Список стенда —
 * `ignore` конфига changesets, второго списка здесь нет.
 */

const ROOT = resolve(__dirname, '../../..')

/** Манифест как есть: поля не принимаются на веру, а проверяются по одному. */
type TManifest = Readonly<Record<string, unknown>>

type TWorkspacePackage = {
	/** Путь от корня репозитория через `/` — то, что пишется в `repository.directory`. */
	readonly dir: string
	readonly manifest: TManifest
}

/** Поля `.changeset/config.json`, на которых держится общая версия. */
type TChangesetConfig = {
	/** Группы пакетов, которые выходят одной версией. */
	readonly fixed: readonly (readonly string[])[]
	/** Пакеты, которые changesets не выпускает, — стенд. */
	readonly ignore: readonly string[]
}

/** Changeset в том виде, в каком его читает сам changesets (`@changesets/read`). */
type TChangeset = {
	/** Имя файла без `.md`, от `.changeset/`. */
	readonly id: string
	readonly releases: readonly { readonly name: string; readonly type: string }[]
}

function isRecord(value: unknown): value is TManifest {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is readonly string[] {
	return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isGroupArray(value: unknown): value is readonly (readonly string[])[] {
	return Array.isArray(value) && value.every(isStringArray)
}

function readJsonObject(file: string): TManifest {
	const parsed: unknown = JSON.parse(readFileSync(file, 'utf-8'))

	if (!isRecord(parsed)) {
		throw new Error(`${file}: ожидается объект JSON`)
	}

	return parsed
}

function readManifest(dir: string): TManifest {
	return readJsonObject(join(ROOT, dir, 'package.json'))
}

/**
 * Читает из конфига changesets `fixed` и `ignore`. Нет поля — пустой список, как
 * у самого changesets; поле другой формы — ошибка, а не молча пустой список.
 */
function readChangesetConfig(): TChangesetConfig {
	const file = join(ROOT, '.changeset', 'config.json')
	const { fixed = [], ignore = [] } = readJsonObject(file)

	if (!isGroupArray(fixed)) {
		throw new Error(`${file}: fixed — не массив групп имён пакетов`)
	}

	if (!isStringArray(ignore)) {
		throw new Error(`${file}: ignore — не массив имён пакетов`)
	}

	return { fixed, ignore }
}

function joinDir(dir: string, name: string): string {
	return dir === '' ? name : `${dir}/${name}`
}

/**
 * Раскрывает шаблон `workspaces` так же, как npm: каталог, подошедший под
 * шаблон, — пакет, если в нём лежит `package.json`. Шаблоны проекта состоят из
 * имён и `*` на месте сегмента; другой синтаксис glob сторож не понимает и
 * падает, а не пропускает пакеты молча.
 */
function expandWorkspace(pattern: string): string[] {
	let dirs = ['']

	for (const segment of pattern.split('/')) {
		if (segment === '*') {
			dirs = dirs.flatMap((dir) =>
				readdirSync(join(ROOT, dir), { withFileTypes: true })
					.filter((entry) => entry.isDirectory())
					.filter((entry) => entry.name !== 'node_modules' && !entry.name.startsWith('.'))
					.map((entry) => joinDir(dir, entry.name)),
			)
		} else if (/[*?[\]{}()!]/.test(segment)) {
			throw new Error(`Шаблон workspaces "${pattern}": сторож понимает только имена и "*"`)
		} else {
			dirs = dirs
				.map((dir) => joinDir(dir, segment))
				.filter((dir) => existsSync(join(ROOT, dir)))
		}
	}

	return dirs.filter((dir) => existsSync(join(ROOT, dir, 'package.json')))
}

function collectWorkspacePackages(root: TManifest): TWorkspacePackage[] {
	const { workspaces } = root

	if (!isStringArray(workspaces)) {
		throw new Error('В корневом package.json нет массива строк workspaces')
	}

	const dirs = new Set(workspaces.flatMap(expandWorkspace))

	return [...dirs].map((dir) => ({ dir, manifest: readManifest(dir) }))
}

/** Библиотечные пакеты — воркспейс без `ignore`: ровно то, что выпускает changesets. */
function selectLibrary(
	packages: readonly TWorkspacePackage[],
	config: TChangesetConfig,
): TWorkspacePackage[] {
	const ignored = new Set<unknown>(config.ignore)

	return packages.filter(({ manifest }) => !ignored.has(manifest.name))
}

/** Нарушения одного библиотечного пакета; пустой список — пакет в порядке. */
function checkLibraryPackage({ dir, manifest }: TWorkspacePackage): string[] {
	const violations: string[] = []
	const { description, license, repository, version } = manifest
	const directory = isRecord(repository) ? repository.directory : undefined

	if (typeof description !== 'string' || description.trim() === '') {
		violations.push('пустой description')
	}

	if (license !== 'MIT') {
		violations.push(`license ${JSON.stringify(license)}, ожидается "MIT"`)
	}

	if (directory !== dir) {
		violations.push(
			`repository.directory ${JSON.stringify(directory)}, ожидается путь пакета "${dir}"`,
		)
	}

	// Пакет без версии changesets пропускает молча — он выпал бы из выпуска.
	if (typeof version !== 'string' || version === '') {
		violations.push(`version ${JSON.stringify(version)}, ожидается строка версии`)
	}

	return violations.map((violation) => `${dir}: ${violation}`)
}

/**
 * Одна версия на все библиотечные пакеты, у корня версии нет: changesets
 * поднимает только пакеты воркспейса, и версия корня после первого же выпуска
 * стала бы устаревшей копией.
 */
function checkVersions(root: TManifest, library: readonly TWorkspacePackage[]): string[] {
	const violations: string[] = []
	const dirsByVersion = new Map<unknown, string[]>()

	if ('version' in root) {
		violations.push(
			`корневой package.json: version ${JSON.stringify(root.version)} — версия у пакетов, у корня её нет`,
		)
	}

	for (const { dir, manifest } of library) {
		dirsByVersion.set(manifest.version, [...(dirsByVersion.get(manifest.version) ?? []), dir])
	}

	if (dirsByVersion.size > 1) {
		const groups = [...dirsByVersion].map(
			([version, dirs]) => `${JSON.stringify(version)} — ${dirs.join(', ')}`,
		)

		violations.push(`версии библиотечных пакетов разошлись: ${groups.join('; ')}`)
	}

	return violations
}

/**
 * `fixed` — одна группа, и в ней ровно библиотечные пакеты. Пакет вне группы
 * разошёлся бы с остальными на первом же выпуске, стенд в группе выпускался бы
 * вместе с библиотекой.
 */
function checkFixed(config: TChangesetConfig, library: readonly TWorkspacePackage[]): string[] {
	const violations: string[] = []
	const libraryNames = new Set(library.map(({ manifest }) => manifest.name))
	const fixedNames = config.fixed.flat()
	const fixedSet = new Set<unknown>(fixedNames)

	if (config.fixed.length !== 1) {
		violations.push(`fixed: групп ${config.fixed.length}, ожидается одна`)
	}

	for (const { dir, manifest } of library) {
		if (!fixedSet.has(manifest.name)) {
			violations.push(
				`fixed: нет ${JSON.stringify(manifest.name)} (${dir}) — пакет вне общей версии`,
			)
		}
	}

	for (const name of fixedNames) {
		if (!libraryNames.has(name)) {
			violations.push(`fixed: ${JSON.stringify(name)} — не библиотечный пакет`)
		}
	}

	return violations
}

/** Имена из `ignore`, которых нет в воркспейсе: исключение стенда без пакета. */
function checkIgnore(config: TChangesetConfig, packages: readonly TWorkspacePackage[]): string[] {
	const names = new Set(packages.map(({ manifest }) => manifest.name))

	return config.ignore
		.filter((name) => !names.has(name))
		.map((name) => `ignore: ${JSON.stringify(name)} — нет такого пакета в воркспейсе`)
}

/**
 * До `1.0` ломающее изменение поднимает minor: `major` у пакета версии `0.x`
 * выпустил бы `1.0.0` всей группы.
 */
function checkChangesets(
	changesets: readonly TChangeset[],
	library: readonly TWorkspacePackage[],
): string[] {
	const violations: string[] = []
	const versions = new Map(
		library.map(({ manifest }): [unknown, unknown] => [manifest.name, manifest.version]),
	)

	for (const { id, releases } of changesets) {
		for (const { name, type } of releases) {
			const version = versions.get(name)

			if (type === 'major' && typeof version === 'string' && version.startsWith('0.')) {
				violations.push(
					`.changeset/${id}.md: major у "${name}" при версии ${version} — до 1.0 ломающее изменение поднимает minor`,
				)
			}
		}
	}

	return violations
}

describe('манифесты пакетов воркспейса', () => {
	const root = readManifest('')
	const packages = collectWorkspacePackages(root)
	const config = readChangesetConfig()
	const library = selectLibrary(packages, config)

	it('библиотечные пакеты заполнены', () => {
		const violations = library.flatMap(checkLibraryPackage)

		expect(
			library.length,
			'из workspaces не раскрылось ни одного библиотечного пакета',
		).toBeGreaterThan(0)
		expect(
			violations,
			'Манифесты разошлись с разделом AGENTS.md «Версии пакетов»:\n' + violations.join('\n'),
		).toEqual([])
	})

	it('библиотечные пакеты идут одной версией, у корня версии нет', () => {
		const violations = checkVersions(root, library)

		expect(
			violations,
			'Версии разошлись с разделом AGENTS.md «Версии пакетов»:\n' + violations.join('\n'),
		).toEqual([])
	})

	it('группа fixed — ровно библиотечные пакеты', () => {
		const violations = checkFixed(config, library)

		expect(
			violations,
			'.changeset/config.json разошёлся с воркспейсом:\n' + violations.join('\n'),
		).toEqual([])
	})

	it('каждое имя из ignore — пакет воркспейса', () => {
		const violations = checkIgnore(config, packages)

		expect(
			violations,
			'Исключение стенда без пакета — уберите имя из ignore:\n' + violations.join('\n'),
		).toEqual([])
	})

	it('changeset не объявляет major, пока версия 0.x', async () => {
		const violations = checkChangesets(await readChangesets(ROOT), library)

		expect(
			violations,
			'Changeset разошёлся с разделом AGENTS.md «Версии пакетов»:\n' + violations.join('\n'),
		).toEqual([])
	})
})

describe('сторож манифестов', () => {
	const VERSION = '1.2.0'

	const library = (overrides: TManifest): TWorkspacePackage => ({
		dir: 'packages/example',
		manifest: {
			name: '@soldy/example',
			version: VERSION,
			description: 'Пакет для проверки сторожа',
			license: 'MIT',
			repository: { type: 'git', directory: 'packages/example' },
			...overrides,
		},
	})

	const other = (version: string): TWorkspacePackage => ({
		dir: 'packages/other',
		manifest: {
			...library({}).manifest,
			name: '@soldy/other',
			version,
			repository: { type: 'git', directory: 'packages/other' },
		},
	})

	const playground: TWorkspacePackage = {
		dir: 'packages/playground/vue',
		manifest: { name: '@soldy/playground-vue', version: '0.0.0' },
	}

	const config = (overrides: Partial<TChangesetConfig>): TChangesetConfig => ({
		fixed: [['@soldy/example', '@soldy/other']],
		ignore: ['@soldy/playground-vue'],
		...overrides,
	})

	const changeset = (type: string): TChangeset => ({
		id: 'brave-dogs-sing',
		releases: [{ name: '@soldy/example', type }],
	})

	it('заполненный пакет — без нарушений', () => {
		expect(checkLibraryPackage(library({}))).toEqual([])
	})

	it('пакет без description — нарушение', () => {
		const expected = ['packages/example: пустой description']

		expect(checkLibraryPackage(library({ description: undefined }))).toEqual(expected)
		expect(checkLibraryPackage(library({ description: '  ' }))).toEqual(expected)
	})

	it('repository.directory не совпадает с путём пакета — нарушение', () => {
		const wrong = library({ repository: { type: 'git', directory: 'packages/other' } })

		expect(checkLibraryPackage(wrong)).toEqual([
			'packages/example: repository.directory "packages/other", ожидается путь пакета "packages/example"',
		])
		expect(checkLibraryPackage(library({ repository: undefined }))).toEqual([
			'packages/example: repository.directory undefined, ожидается путь пакета "packages/example"',
		])
	})

	it('лицензия не MIT — нарушение', () => {
		expect(checkLibraryPackage(library({ license: 'ISC' }))).toEqual([
			'packages/example: license "ISC", ожидается "MIT"',
		])
	})

	it('пакет без version — нарушение', () => {
		expect(checkLibraryPackage(library({ version: undefined }))).toEqual([
			'packages/example: version undefined, ожидается строка версии',
		])
	})

	it('одна версия и корень без version — без нарушений', () => {
		expect(checkVersions({ name: 'soldy' }, [library({}), other(VERSION)])).toEqual([])
	})

	it('версии библиотечных пакетов разошлись — нарушение с их списком', () => {
		expect(checkVersions({ name: 'soldy' }, [library({}), other('1.3.0')])).toEqual([
			'версии библиотечных пакетов разошлись: "1.2.0" — packages/example; "1.3.0" — packages/other',
		])
	})

	it('version у корня — нарушение', () => {
		expect(checkVersions({ name: 'soldy', version: VERSION }, [library({})])).toEqual([
			'корневой package.json: version "1.2.0" — версия у пакетов, у корня её нет',
		])
	})

	it('стенд из ignore — не библиотечный пакет', () => {
		const packages = [library({}), other(VERSION), playground]

		expect(selectLibrary(packages, config({}))).toEqual([library({}), other(VERSION)])
		expect(selectLibrary(packages, config({ ignore: [] }))).toContainEqual(playground)
	})

	it('fixed из библиотечных пакетов — без нарушений', () => {
		expect(checkFixed(config({}), [library({}), other(VERSION)])).toEqual([])
	})

	it('пакет вне fixed — нарушение', () => {
		expect(
			checkFixed(config({ fixed: [['@soldy/example']] }), [library({}), other(VERSION)]),
		).toEqual(['fixed: нет "@soldy/other" (packages/other) — пакет вне общей версии'])
	})

	it('стенд в fixed — нарушение', () => {
		const fixed = [['@soldy/example', '@soldy/other', '@soldy/playground-vue']]

		expect(checkFixed(config({ fixed }), [library({}), other(VERSION)])).toEqual([
			'fixed: "@soldy/playground-vue" — не библиотечный пакет',
		])
	})

	it('fixed из двух групп — нарушение', () => {
		const fixed = [['@soldy/example'], ['@soldy/other']]

		expect(checkFixed(config({ fixed }), [library({}), other(VERSION)])).toEqual([
			'fixed: групп 2, ожидается одна',
		])
	})

	it('имя из ignore без пакета — нарушение', () => {
		const ignore = ['@soldy/playground-vue', '@soldy/playground-react']

		expect(checkIgnore(config({ ignore }), [library({}), playground])).toEqual([
			'ignore: "@soldy/playground-react" — нет такого пакета в воркспейсе',
		])
	})

	it('major при версии 0.x — нарушение', () => {
		expect(checkChangesets([changeset('major')], [library({ version: '0.3.0' })])).toEqual([
			'.changeset/brave-dogs-sing.md: major у "@soldy/example" при версии 0.3.0 — до 1.0 ломающее изменение поднимает minor',
		])
	})

	it('minor при версии 0.x и major при 1.x — без нарушений', () => {
		expect(checkChangesets([changeset('minor')], [library({ version: '0.3.0' })])).toEqual([])
		expect(checkChangesets([changeset('major')], [library({})])).toEqual([])
	})
})
