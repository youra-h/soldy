import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * Сторож раздела «Версии пакетов» (см. AGENTS.md). Все библиотечные пакеты
 * `@soldy/*` идут одной версией — версией корневого манифеста — и несут
 * метаданные пакета: описание, лицензию и путь в репозитории.
 *
 * Список пакетов не хардкодится: он раскрывается из `workspaces` корневого
 * манифеста, поэтому новый пакет попадает под проверку сам.
 */

const ROOT = resolve(__dirname, '../../..')

/**
 * Пакеты стенда. Стенд — инструмент разработки, а не библиотека: в общую
 * версию не входит и метаданных пакета не несёт. Новый стенд вносится сюда
 * явно; забытый упадёт на проверке как библиотечный пакет.
 */
const PLAYGROUND_PACKAGES: ReadonlySet<string> = new Set([
	'@soldy/playground-shared',
	'@soldy/playground-vue',
])

/** Манифест как есть: поля не принимаются на веру, а проверяются по одному. */
type TManifest = Readonly<Record<string, unknown>>

type TWorkspacePackage = {
	/** Путь от корня репозитория через `/` — то, что пишется в `repository.directory`. */
	readonly dir: string
	readonly manifest: TManifest
}

function isRecord(value: unknown): value is TManifest {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is readonly string[] {
	return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function readManifest(dir: string): TManifest {
	const file = join(ROOT, dir, 'package.json')
	const parsed: unknown = JSON.parse(readFileSync(file, 'utf-8'))

	if (!isRecord(parsed)) {
		throw new Error(`${file}: манифест не объект`)
	}

	return parsed
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

function isPlayground({ manifest }: TWorkspacePackage): boolean {
	return typeof manifest.name === 'string' && PLAYGROUND_PACKAGES.has(manifest.name)
}

/** Нарушения одного библиотечного пакета; пустой список — пакет в порядке. */
function checkLibraryPackage({ dir, manifest }: TWorkspacePackage, version: unknown): string[] {
	const violations: string[] = []
	const { description, license, repository } = manifest
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

	if (manifest.version !== version) {
		violations.push(
			`version ${JSON.stringify(manifest.version)}, ожидается версия корня ${JSON.stringify(version)}`,
		)
	}

	return violations.map((violation) => `${dir}: ${violation}`)
}

/** Нарушения по всем пакетам воркспейса; стенд не проверяется. */
function collectViolations(packages: readonly TWorkspacePackage[], version: unknown): string[] {
	return packages
		.filter((pkg) => !isPlayground(pkg))
		.flatMap((pkg) => checkLibraryPackage(pkg, version))
}

describe('манифесты пакетов воркспейса', () => {
	const root = readManifest('')
	const packages = collectWorkspacePackages(root)

	it('библиотечные пакеты заполнены и идут версией корня', () => {
		const violations = collectViolations(packages, root.version)

		expect(
			packages.filter((pkg) => !isPlayground(pkg)).length,
			'из workspaces не раскрылось ни одного библиотечного пакета',
		).toBeGreaterThan(0)
		expect(
			violations,
			'Манифесты разошлись с разделом AGENTS.md «Версии пакетов»:\n' + violations.join('\n'),
		).toEqual([])
	})

	it('каждое имя из списка стенда — пакет воркспейса', () => {
		const names = new Set(packages.map(({ manifest }) => manifest.name))
		const stale = [...PLAYGROUND_PACKAGES].filter((name) => !names.has(name))

		expect(stale, 'Исключение стенда без пакета — уберите имя из списка').toEqual([])
	})
})

describe('сторож манифестов', () => {
	const ROOT_VERSION = '1.2.0'

	const library = (overrides: TManifest): TWorkspacePackage => ({
		dir: 'packages/example',
		manifest: {
			name: '@soldy/example',
			version: ROOT_VERSION,
			description: 'Пакет для проверки сторожа',
			license: 'MIT',
			repository: { type: 'git', directory: 'packages/example' },
			...overrides,
		},
	})

	it('заполненный пакет на версии корня — без нарушений', () => {
		expect(collectViolations([library({})], ROOT_VERSION)).toEqual([])
	})

	it('пакет без description — нарушение', () => {
		const expected = ['packages/example: пустой description']

		expect(collectViolations([library({ description: undefined })], ROOT_VERSION)).toEqual(
			expected,
		)
		expect(collectViolations([library({ description: '  ' })], ROOT_VERSION)).toEqual(expected)
	})

	it('версия, отличная от корневой, — нарушение', () => {
		expect(collectViolations([library({ version: '0.0.0' })], ROOT_VERSION)).toEqual([
			'packages/example: version "0.0.0", ожидается версия корня "1.2.0"',
		])
	})

	it('repository.directory не совпадает с путём пакета — нарушение', () => {
		const wrong = library({ repository: { type: 'git', directory: 'packages/other' } })

		expect(collectViolations([wrong], ROOT_VERSION)).toEqual([
			'packages/example: repository.directory "packages/other", ожидается путь пакета "packages/example"',
		])
		expect(collectViolations([library({ repository: undefined })], ROOT_VERSION)).toEqual([
			'packages/example: repository.directory undefined, ожидается путь пакета "packages/example"',
		])
	})

	it('лицензия не MIT — нарушение', () => {
		expect(collectViolations([library({ license: 'ISC' })], ROOT_VERSION)).toEqual([
			'packages/example: license "ISC", ожидается "MIT"',
		])
	})

	it('стенд на 0.0.0 без метаданных — не нарушение', () => {
		const playground: TWorkspacePackage = {
			dir: 'packages/playground/vue',
			manifest: { name: '@soldy/playground-vue', version: '0.0.0' },
		}

		expect(collectViolations([playground], ROOT_VERSION)).toEqual([])
	})
})
