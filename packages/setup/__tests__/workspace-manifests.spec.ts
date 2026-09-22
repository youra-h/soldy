import { describe, it, expect } from 'vitest'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, posix, resolve } from 'node:path'
import { readChangesets } from '@changesets/read'

/**
 * Сторож раздела «Версии пакетов» (см. AGENTS.md). Версии ведёт changesets:
 * библиотечные пакеты `@soldy-ui/*` — одна группа `fixed` и потому одна версия,
 * стенд — в `ignore`. Библиотечный пакет несёт метаданные: описание, лицензию и
 * путь в репозитории, — а его точки входа ведут на файлы.
 *
 * Библиотечный пакет ещё и выкладывается: он не `private`, у скоупа открыт
 * доступ, состав тарболла задан `files`, а текст лицензии и README лежат рядом
 * с манифестом — поля `license` в тарболле мало. Соседа он объявляет диапазоном
 * от общей версии (`^0.1.0`): протокол `workspace:` npm не понимает
 * (EUNSUPPORTEDPROTOCOL), а `"*"` выпуск не переписывает — в опубликованном
 * пакете он значил бы «любая версия ядра».
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

/** Поля манифеста, чьи цели — файлы пакета. */
const ENTRY_FIELDS = ['main', 'types', 'style', 'exports'] as const

/**
 * Игнорирует ли git путь от корня репозитория. Код 0 — игнорирует, 1 — нет;
 * любой другой исход (git не запустился, корень не репозиторий) — сбой, и он
 * роняет сторож, а не читается как «не игнорирует».
 */
function isGitIgnored(path: string): boolean {
	const { status, error, stderr } = spawnSync('git', ['check-ignore', '--quiet', '--', path], {
		cwd: ROOT,
		encoding: 'utf-8',
	})

	if (status !== 0 && status !== 1) {
		throw new Error(`git check-ignore ${path}: ${error?.message ?? stderr}`)
	}

	return status === 0
}

/** Пакет собирается: у него есть скрипт `build`. */
function hasBuildScript({ manifest }: TWorkspacePackage): boolean {
	const { scripts } = manifest

	return isRecord(scripts) && typeof scripts.build === 'string'
}

/** Цель точки входа: как она объявлена в манифесте и куда ведёт от корня репозитория. */
type TEntryTarget = {
	/** `exports["."]["types"] "./dist/index.d.ts"` — для текста нарушения. */
	readonly declared: string
	/** Путь от корня репозитория через `/`. */
	readonly path: string
}

/**
 * Цели `main`, `types`, `style` и `exports`. `exports` разбирается вглубь:
 * строка — цель, объект — условия или подпути.
 */
function entryTargets({ dir, manifest }: TWorkspacePackage): TEntryTarget[] {
	const collect = (field: string, value: unknown): TEntryTarget[] => {
		if (value === undefined) {
			return []
		}

		if (isRecord(value)) {
			return Object.entries(value).flatMap(([key, nested]) =>
				collect(`${field}[${JSON.stringify(key)}]`, nested),
			)
		}

		if (typeof value !== 'string') {
			throw new Error(
				`${dir}: ${field} ${JSON.stringify(value)} — сторож понимает только путь и объект условий`,
			)
		}

		return [{ declared: `${field} ${JSON.stringify(value)}`, path: posix.join(dir, value) }]
	}

	return ENTRY_FIELDS.flatMap((field) => collect(field, manifest[field]))
}

/**
 * Пакет отдаёт наружу сборку: хотя бы одна его точка входа ведёт в то, чего
 * в чистом клоне нет. Пока точки входа показывают на исходники, собирать нечего.
 */
function shipsBuildOutput(pkg: TWorkspacePackage): boolean {
	return entryTargets(pkg).some(({ path }) => isGitIgnored(path))
}

/**
 * Нарушения точек входа: цель `main`, `types`, `style` и `exports` — файл пакета.
 *
 * Цели, которую игнорирует git, в чистом клоне нет — это выход сборки, и он
 * допустим, только если у пакета есть скрипт `build`. Ответ не зависит от того,
 * собран ли пакет на этой машине. Куда пишет сборщик, сторож не читает: это
 * привязало бы его к одному сборщику.
 */
function checkEntryPoints(pkg: TWorkspacePackage): string[] {
	const buildable = hasBuildScript(pkg)

	return entryTargets(pkg).flatMap(({ declared, path }) => {
		if (isGitIgnored(path)) {
			return buildable
				? []
				: [`${declared} — выход сборки (игнорируется git), а скрипта build у пакета нет`]
		}

		return statSync(join(ROOT, path), { throwIfNoEntry: false })?.isFile()
			? []
			: [`${declared} — нет такого файла`]
	})
}

/**
 * Нарушения полей выкладки: библиотечный пакет выкладывается в npm, а не
 * закрыт от него.
 *
 * `private` закрывает пакет от `npm publish` целиком. У скоуплённого пакета
 * доступ по умолчанию `restricted`, и без `publishConfig.access` публикация
 * упала бы на платном тарифе. `files` задаёт состав тарболла: без него наружу
 * уезжает весь каталог пакета вместе с `__tests__` и конфигами.
 */
function checkPublishing(manifest: TManifest): string[] {
	const violations: string[] = []
	const { private: restricted, publishConfig, files } = manifest
	const access = isRecord(publishConfig) ? publishConfig.access : undefined

	if (restricted !== undefined) {
		violations.push(`private ${JSON.stringify(restricted)} — библиотечный пакет выкладывается`)
	}

	if (access !== 'public') {
		violations.push(
			`publishConfig.access ${JSON.stringify(access)}, ожидается "public" — у скоупа доступ по умолчанию restricted`,
		)
	}

	if (!isStringArray(files) || files.length === 0) {
		violations.push(`files ${JSON.stringify(files)}, ожидается непустой список путей тарболла`)
	}

	return violations
}

/** Файлы пакета, прочитанные с диска: имя файла → текст, нет файла — undefined. */
type TPackageFiles = Readonly<Record<string, string | undefined>>

/**
 * Перевод строки содержимым не считается: `.gitattributes` нормализует его в
 * LF, и в рабочей копии на Windows у соседних файлов он расходится сам по
 * себе — по тому, какой из них когда чекаутился.
 */
function withLf(text: string): string {
	return text.replace(/\r\n/g, '\n')
}

/**
 * Нарушения состава тарболла: рядом с манифестом лежат README и LICENSE, и
 * лицензия — копия корневой.
 *
 * Оба файла npm кладёт в тарболл мимо `files`, и оба видит потребитель: поля
 * `license` в манифесте мало — оно называет лицензию, но не несёт её текста, а
 * пакет без README на npm выглядит заброшенным.
 */
function checkShippedFiles(files: TPackageFiles, license: string): string[] {
	const violations: string[] = []
	const readme = files['README.md']

	if (readme === undefined) {
		violations.push('нет README.md — его читают на npm вместо описания')
	} else if (readme.trim() === '') {
		violations.push('README.md пуст')
	}

	if (files.LICENSE === undefined) {
		violations.push('нет LICENSE — в тарболле у пакета нет текста лицензии')
	} else if (withLf(files.LICENSE) !== withLf(license)) {
		violations.push('LICENSE расходится с корневым — это его копия, а не своя лицензия')
	}

	return violations
}

/** Читает файлы пакета, которые уезжают в тарболл рядом с манифестом. */
function readShippedFiles(dir: string): TPackageFiles {
	const read = (name: string): string | undefined => {
		const file = join(ROOT, dir, name)

		return statSync(file, { throwIfNoEntry: false })?.isFile()
			? readFileSync(file, 'utf-8')
			: undefined
	}

	return { 'README.md': read('README.md'), LICENSE: read('LICENSE') }
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

	violations.push(...checkPublishing(manifest))
	violations.push(...checkEntryPoints({ dir, manifest }))

	return violations.map((violation) => `${dir}: ${violation}`)
}

/** Поля манифеста, в которых объявляют зависимость. */
const DEPENDENCY_FIELDS = [
	'dependencies',
	'devDependencies',
	'peerDependencies',
	'optionalDependencies',
] as const

/**
 * Нарушения диапазонов на соседей: сосед объявлен `^<его версия>`.
 *
 * Протокол `workspace:` npm не понимает вовсе (EUNSUPPORTEDPROTOCOL на
 * `npm install`), поэтому диапазон литеральный. `"*"` не годится: выпуск
 * переписывает диапазон, только когда новая версия из него выпала, а из `"*"`
 * не выпадает ничего — в опубликованном пакете он значил бы «любая версия
 * ядра», включая ту, с которой контракт разошёлся. Версии у группы одна, и её
 * же берёт диапазон: второго списка версий в репозитории нет.
 */
function checkInternalRanges(library: readonly TWorkspacePackage[]): string[] {
	const versions = new Map(
		library.map(({ manifest }): [unknown, unknown] => [manifest.name, manifest.version]),
	)

	return library.flatMap(({ dir, manifest }) =>
		DEPENDENCY_FIELDS.flatMap((field) => {
			const deps = manifest[field]

			if (!isRecord(deps)) {
				return []
			}

			return Object.entries(deps).flatMap(([name, range]) => {
				const version = versions.get(name)

				if (version === undefined) {
					return []
				}

				const expected = `^${String(version)}`

				return range === expected
					? []
					: [
							`${dir}: ${field}["${name}"] ${JSON.stringify(range)}, ожидается ${JSON.stringify(expected)}`,
						]
			})
		}),
	)
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
 * Воркспейсы, которые зовёт корневой `build`, — в порядке вызова. Скрипт
 * собирается из `npm run build --workspace=<имя>`, и второго списка пакетов
 * сборки в репозитории нет.
 */
function buildOrder(root: TManifest): string[] {
	const { scripts } = root

	if (!isRecord(scripts) || typeof scripts.build !== 'string') {
		throw new Error('В корневом package.json нет скрипта build')
	}

	return [...scripts.build.matchAll(/--workspace=(\S+)/g)].map(([, name]) => name)
}

/**
 * Корневой `build` собирает каждый пакет, который отдаёт наружу сборку, и в
 * порядке зависимостей, а не алфавита: прогон деклараций читает соседа через
 * его манифест, то есть по собранному `dist`. Кто от кого зависит, сторож берёт
 * из `dependencies` манифестов — второго списка нет.
 *
 * `peerDependencies` не в счёт: их ставит потребитель, а не воркспейс, и тема
 * объявляет ими ядро, которое её сборке CSS не нужно вовсе.
 */
function checkBuildOrder(root: TManifest, library: readonly TWorkspacePackage[]): string[] {
	const violations: string[] = []
	const order = buildOrder(root)
	const buildable = new Set(library.filter(hasBuildScript).map(({ manifest }) => manifest.name))
	const position = new Map<unknown, number>(order.map((name, index) => [name, index]))

	for (const pkg of library) {
		if (shipsBuildOutput(pkg) && !position.has(pkg.manifest.name)) {
			violations.push(
				`build: нет ${JSON.stringify(pkg.manifest.name)} (${pkg.dir}) — пакет отдаёт наружу сборку, а корневой build её не делает`,
			)
		}
	}

	for (const name of order) {
		if (!buildable.has(name)) {
			violations.push(
				`build: ${JSON.stringify(name)} — не библиотечный пакет со скриптом build`,
			)
		}
	}

	for (const { manifest } of library) {
		const index = position.get(manifest.name)
		const dependencies = isRecord(manifest.dependencies)
			? Object.keys(manifest.dependencies)
			: []

		if (index === undefined) {
			continue
		}

		for (const dependency of dependencies) {
			const required = position.get(dependency)

			if (required !== undefined && required > index) {
				violations.push(
					`build: ${JSON.stringify(manifest.name)} собирается раньше ${JSON.stringify(dependency)}, от которого зависит`,
				)
			}
		}
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

	it('у библиотечного пакета рядом README и копия корневой лицензии', () => {
		const license = readFileSync(join(ROOT, 'LICENSE'), 'utf-8')
		const violations = library.flatMap(({ dir }) =>
			checkShippedFiles(readShippedFiles(dir), license).map(
				(violation) => `${dir}: ${violation}`,
			),
		)

		expect(
			violations,
			'Состав тарболла разошёлся с разделом AGENTS.md «Версии пакетов»:\n' +
				violations.join('\n'),
		).toEqual([])
	})

	it('сосед объявлен диапазоном от общей версии', () => {
		const violations = checkInternalRanges(library)

		expect(
			violations,
			'Диапазоны на соседей разошлись с разделом AGENTS.md «Версии пакетов»:\n' +
				violations.join('\n'),
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

	it('корневой build собирает все собираемые пакеты и в порядке зависимостей', () => {
		const violations = checkBuildOrder(root, library)

		expect(
			violations,
			'Корневой build разошёлся с разделом AGENTS.md «Сборка пакетов»:\n' +
				violations.join('\n'),
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
			name: '@soldy-ui/example',
			version: VERSION,
			description: 'Пакет для проверки сторожа',
			license: 'MIT',
			repository: { type: 'git', directory: 'packages/example' },
			publishConfig: { access: 'public' },
			files: ['dist'],
			...overrides,
		},
	})

	const other = (version: string): TWorkspacePackage => ({
		dir: 'packages/other',
		manifest: {
			...library({}).manifest,
			name: '@soldy-ui/other',
			version,
			repository: { type: 'git', directory: 'packages/other' },
		},
	})

	const playground: TWorkspacePackage = {
		dir: 'packages/playground/vue',
		manifest: { name: '@soldy-ui/playground-vue', version: '0.0.0' },
	}

	const config = (overrides: Partial<TChangesetConfig>): TChangesetConfig => ({
		fixed: [['@soldy-ui/example', '@soldy-ui/other']],
		ignore: ['@soldy-ui/playground-vue'],
		...overrides,
	})

	const changeset = (type: string): TChangeset => ({
		id: 'brave-dogs-sing',
		releases: [{ name: '@soldy-ui/example', type }],
	})

	it('заполненный пакет — без нарушений', () => {
		expect(checkLibraryPackage(library({}))).toEqual([])
	})

	it('пакет без description — нарушение', () => {
		const expected = ['packages/example: пустой description']

		expect(checkLibraryPackage(library({ description: undefined }))).toEqual(expected)
		expect(checkLibraryPackage(library({ description: '  ' }))).toEqual(expected)
	})

	it('private у библиотечного пакета — нарушение', () => {
		expect(checkLibraryPackage(library({ private: true }))).toEqual([
			'packages/example: private true — библиотечный пакет выкладывается',
		])
	})

	it('доступ скоупа не public — нарушение', () => {
		const restricted = 'publishConfig.access "restricted", ожидается "public"'
		const missing = 'publishConfig.access undefined, ожидается "public"'
		const why = ' — у скоупа доступ по умолчанию restricted'

		expect(checkLibraryPackage(library({ publishConfig: { access: 'restricted' } }))).toEqual([
			`packages/example: ${restricted}${why}`,
		])
		expect(checkLibraryPackage(library({ publishConfig: undefined }))).toEqual([
			`packages/example: ${missing}${why}`,
		])
	})

	it('пакет без files — нарушение', () => {
		const expected = (declared: string): string[] => [
			`packages/example: files ${declared}, ожидается непустой список путей тарболла`,
		]

		expect(checkLibraryPackage(library({ files: undefined }))).toEqual(expected('undefined'))
		expect(checkLibraryPackage(library({ files: [] }))).toEqual(expected('[]'))
		expect(checkLibraryPackage(library({ files: 'dist' }))).toEqual(expected('"dist"'))
	})

	it('цель точки входа без файла — нарушение с путём', () => {
		const entries = {
			main: './index.ts',
			exports: {
				'.': './index.ts',
				'./contributions': { default: './contributions/index.ts' },
			},
		}

		expect(checkLibraryPackage(library(entries))).toEqual([
			'packages/example: main "./index.ts" — нет такого файла',
			'packages/example: exports["."] "./index.ts" — нет такого файла',
			'packages/example: exports["./contributions"]["default"] "./contributions/index.ts" — нет такого файла',
		])
	})

	// `dist/` — в корневом .gitignore: сборки в чистом клоне нет.
	it('цель в выходе сборки — без нарушений со скриптом build, без него — нарушение', () => {
		const entries = {
			style: './dist/index.css',
			exports: { '.': { default: './dist/index.css' } },
		}
		const notBuilt = '— выход сборки (игнорируется git), а скрипта build у пакета нет'

		expect(
			checkLibraryPackage(library({ ...entries, scripts: { build: 'vite build' } })),
		).toEqual([])
		expect(checkLibraryPackage(library(entries))).toEqual([
			`packages/example: style "./dist/index.css" ${notBuilt}`,
			`packages/example: exports["."]["default"] "./dist/index.css" ${notBuilt}`,
		])
	})

	it('цель не путь и не объект условий — сторож падает, а не пропускает её', () => {
		expect(() => checkLibraryPackage(library({ exports: { '.': ['./index.ts'] } }))).toThrow(
			'packages/example: exports["."] ["./index.ts"] — сторож понимает только путь и объект условий',
		)
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

	describe('README и LICENSE рядом с манифестом', () => {
		const LICENSE = 'MIT License\n\nCopyright (c) 2026 Yuri Soldatov\n'

		it('оба файла на месте, лицензия — копия корневой — без нарушений', () => {
			const files = { 'README.md': '# @soldy-ui/example\n', LICENSE }

			expect(checkShippedFiles(files, LICENSE)).toEqual([])
		})

		it('нет файлов — нарушение на каждый', () => {
			expect(checkShippedFiles({}, LICENSE)).toEqual([
				'нет README.md — его читают на npm вместо описания',
				'нет LICENSE — в тарболле у пакета нет текста лицензии',
			])
		})

		it('пустой README — нарушение', () => {
			expect(checkShippedFiles({ 'README.md': ' \n', LICENSE }, LICENSE)).toEqual([
				'README.md пуст',
			])
		})

		it('лицензия расходится с корневой — нарушение', () => {
			const files = { 'README.md': '# @soldy-ui/example\n', LICENSE: 'ISC License\n' }

			expect(checkShippedFiles(files, LICENSE)).toEqual([
				'LICENSE расходится с корневым — это его копия, а не своя лицензия',
			])
		})

		// Перевод строки нормализует git (.gitattributes), и в рабочей копии на
		// Windows у соседних файлов он расходится сам по себе
		it('та же лицензия с другим переводом строки — без нарушений', () => {
			const files = { 'README.md': '# @soldy-ui/example\n', LICENSE }

			expect(checkShippedFiles(files, LICENSE.replace(/\n/g, '\r\n'))).toEqual([])
		})

		// Читатель ходит на диск: у самого сторожа README и LICENSE есть
		it('файлы пакета читаются с диска', () => {
			const files = readShippedFiles('packages/setup')
			const root = readFileSync(join(ROOT, 'LICENSE'), 'utf-8')

			expect(files['README.md']).toContain('@soldy-ui/setup')
			expect(checkShippedFiles(files, root)).toEqual([])
			expect(readShippedFiles('packages/example')).toEqual({
				'README.md': undefined,
				LICENSE: undefined,
			})
		})
	})

	describe('диапазоны на соседей', () => {
		/** Зависит от `@soldy-ui/example` — с тем полем и тем диапазоном, что дали. */
		const dependent = (field: string, range: unknown): TWorkspacePackage => ({
			dir: 'packages/other',
			manifest: {
				...other(VERSION).manifest,
				[field]: { '@soldy-ui/example': range, vue: '^3.5.32' },
			},
		})

		it('диапазон от общей версии — без нарушений', () => {
			for (const field of DEPENDENCY_FIELDS) {
				expect(
					checkInternalRanges([library({}), dependent(field, `^${VERSION}`)]),
					field,
				).toEqual([])
			}
		})

		it('"*" на соседе — нарушение: выпуск такой диапазон не переписывает', () => {
			expect(checkInternalRanges([library({}), dependent('dependencies', '*')])).toEqual([
				'packages/other: dependencies["@soldy-ui/example"] "*", ожидается "^1.2.0"',
			])
		})

		it('протокол workspace — нарушение: npm его не понимает', () => {
			expect(
				checkInternalRanges([library({}), dependent('peerDependencies', 'workspace:^')]),
			).toEqual([
				'packages/other: peerDependencies["@soldy-ui/example"] "workspace:^", ожидается "^1.2.0"',
			])
		})

		it('диапазон отстал от версии соседа — нарушение', () => {
			expect(
				checkInternalRanges([library({}), dependent('devDependencies', '^1.1.0')]),
			).toEqual([
				'packages/other: devDependencies["@soldy-ui/example"] "^1.1.0", ожидается "^1.2.0"',
			])
		})
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

	describe('порядок корневого build', () => {
		/** Отдаёт наружу сборку: `dist/` игнорируется git, и в чистом клоне его нет. */
		const built = (overrides: TManifest = {}): TWorkspacePackage =>
			library({
				main: './dist/index.js',
				scripts: { build: 'vite build' },
				...overrides,
			})

		/** Зависит от `@soldy-ui/example`, поэтому собирается после него. */
		const dependent: TWorkspacePackage = {
			dir: 'packages/other',
			manifest: {
				...built().manifest,
				name: '@soldy-ui/other',
				repository: { type: 'git', directory: 'packages/other' },
				dependencies: { '@soldy-ui/example': '*' },
			},
		}

		const script = (...names: string[]): TManifest => ({
			name: 'soldy',
			scripts: {
				build: names.map((name) => `npm run build --workspace=${name}`).join(' && '),
			},
		})

		it('зависимость впереди зависящего — без нарушений', () => {
			const root = script('@soldy-ui/example', '@soldy-ui/other')

			expect(checkBuildOrder(root, [built(), dependent])).toEqual([])
		})

		it('зависимость позади зависящего — нарушение', () => {
			const root = script('@soldy-ui/other', '@soldy-ui/example')

			expect(checkBuildOrder(root, [built(), dependent])).toEqual([
				'build: "@soldy-ui/other" собирается раньше "@soldy-ui/example", от которого зависит',
			])
		})

		it('пакет со сборкой наружу вне корневого build — нарушение', () => {
			const root = script('@soldy-ui/example')

			expect(checkBuildOrder(root, [built(), dependent])).toEqual([
				'build: нет "@soldy-ui/other" (packages/other) — пакет отдаёт наружу сборку, а корневой build её не делает',
			])
		})

		// Скрипт `build` у пакета, чьи точки входа ведут на исходники, — это
		// адаптер Vue до задачи 02: сборка есть, но наружу уходят исходники
		it('пакет со скриптом build, отдающий исходники, — без нарушений', () => {
			const sources = built({ main: './src/index.ts' })

			expect(checkBuildOrder(script('@soldy-ui/example'), [built(), sources])).toEqual([])
		})

		// Пакет без скрипта `build` собирать нечем: имя в корневом build уронило бы его
		it('пакет без скрипта build в корневом build — нарушение', () => {
			const root = script('@soldy-ui/example', '@soldy-ui/other')

			expect(checkBuildOrder(root, [built()])).toEqual([
				'build: "@soldy-ui/other" — не библиотечный пакет со скриптом build',
			])
		})

		it('корень без скрипта build — сторож падает, а не молчит', () => {
			expect(() => checkBuildOrder({ name: 'soldy' }, [built()])).toThrow(
				'В корневом package.json нет скрипта build',
			)
		})
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
			checkFixed(config({ fixed: [['@soldy-ui/example']] }), [library({}), other(VERSION)]),
		).toEqual(['fixed: нет "@soldy-ui/other" (packages/other) — пакет вне общей версии'])
	})

	it('стенд в fixed — нарушение', () => {
		const fixed = [['@soldy-ui/example', '@soldy-ui/other', '@soldy-ui/playground-vue']]

		expect(checkFixed(config({ fixed }), [library({}), other(VERSION)])).toEqual([
			'fixed: "@soldy-ui/playground-vue" — не библиотечный пакет',
		])
	})

	it('fixed из двух групп — нарушение', () => {
		const fixed = [['@soldy-ui/example'], ['@soldy-ui/other']]

		expect(checkFixed(config({ fixed }), [library({}), other(VERSION)])).toEqual([
			'fixed: групп 2, ожидается одна',
		])
	})

	it('имя из ignore без пакета — нарушение', () => {
		const ignore = ['@soldy-ui/playground-vue', '@soldy-ui/playground-react']

		expect(checkIgnore(config({ ignore }), [library({}), playground])).toEqual([
			'ignore: "@soldy-ui/playground-react" — нет такого пакета в воркспейсе',
		])
	})

	it('major при версии 0.x — нарушение', () => {
		expect(checkChangesets([changeset('major')], [library({ version: '0.3.0' })])).toEqual([
			'.changeset/brave-dogs-sing.md: major у "@soldy-ui/example" при версии 0.3.0 — до 1.0 ломающее изменение поднимает minor',
		])
	})

	it('minor при версии 0.x и major при 1.x — без нарушений', () => {
		expect(checkChangesets([changeset('minor')], [library({ version: '0.3.0' })])).toEqual([])
		expect(checkChangesets([changeset('major')], [library({})])).toEqual([])
	})
})
