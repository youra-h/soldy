import { describe, it, expect } from 'vitest'
import { posix, relative, resolve, sep } from 'node:path'
import * as ts from 'typescript'

/**
 * Сторож абзаца «Локальная разработка сборки не требует» (AGENTS.md, «Сборка
 * пакетов»). Проверки типов ходят в соседей и в сам пакет исходниками — по
 * `paths` своего конфига. Цель, которая называет каталог с `package.json`,
 * TypeScript разрешает через манифест: по `types` — в `dist`, а без `dist` — в
 * `index.ts` каталога. Проверка типов тогда судит то, что лежит в игнорируемом
 * каталоге: в CI её шаг идёт после сборки, и `dist` свежий, а локально — какой
 * остался. Так «Типы — Setup» читал сам пакет (`"@soldy-ui/setup": ["."]`):
 * спеки, которые импортируют его по имени, сверялись со старой сборкой и
 * краснели на коде, которого в исходниках уже нет.
 *
 * Проверяется цель, а не резолв: тесты в CI идут до сборки, и без `dist` резолв
 * уходит в исходники — дефекта не видно. Шаблон с `*` сверяется с каждым
 * каталогом пакета, в который его приводит подстановка: `"@soldy-ui/*":
 * ["../*"]` ведёт в каталоги всех пакетов разом. Опции судятся действующие — с
 * учётом `extends`, как их читает сам TypeScript, — и цель считается от того же
 * каталога, что у него: от звена, которое объявило `paths`.
 *
 * Список конфигов не хардкодится: это каждый `tsconfig*.json` репозитория, и
 * находит их тот же обход, которым TypeScript раскрывает `include`, —
 * `node_modules` он пропускает.
 */

const ROOT = resolve(__dirname, '../../..')

/** Почему каталог пакета не годится в цель `paths`. */
const WHY = 'каталог с package.json: TypeScript разрешит его через манифест, то есть в dist'

/** Ошибка TypeScript в разборе конфига — нарушение со своим текстом. */
function unparsed(diagnostic: ts.Diagnostic): string {
	return `не разобран: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`
}

/**
 * Каталог, от которого TypeScript считает цели `paths`: `baseUrl`, а без него —
 * каталог звена `extends`, которое `paths` объявило. Его TypeScript кладёт в
 * опции разбора полем `pathsBasePath`, которого нет в публичных типах, — поэтому
 * поле проверяется, а не берётся на веру: пропади оно, сторож упадёт, а не
 * начнёт считать цели не от того каталога.
 */
function pathsBaseOf(options: ts.CompilerOptions): string {
	const base = options.baseUrl ?? options.pathsBasePath

	if (typeof base !== 'string') {
		throw new Error('TypeScript не назвал каталог, от которого считаются цели paths')
	}

	return base
}

/**
 * Подстановки цели, которые называют каталог с `package.json`, — как они
 * записаны в конфиге. Точная цель — она сама. В шаблоне `*` TypeScript
 * заменяет любой строкой, `/` в том числе, поэтому манифесты ищутся под
 * неизменной частью шаблона, и каждый подошедший даёт свою подстановку.
 */
function packageTargets(target: string, base: string, host: ts.ParseConfigHost): string[] {
	const path = posix.join(base, target)
	const star = path.indexOf('*')

	if (star < 0) {
		return host.fileExists(posix.join(path, 'package.json')) ? [target] : []
	}

	const prefix = path.slice(0, star)
	const suffix = path.slice(star + 1)
	const root = prefix.endsWith('/') ? prefix.slice(0, -1) : posix.dirname(prefix)

	return host
		.readDirectory(root, ['.json'], undefined, ['**/package.json'])
		.filter((file) => posix.basename(file) === 'package.json')
		.map((file) => posix.dirname(file))
		.filter(
			(dir) =>
				dir.length >= prefix.length + suffix.length &&
				dir.startsWith(prefix) &&
				dir.endsWith(suffix),
		)
		.map((dir) => target.replace('*', dir.slice(prefix.length, dir.length - suffix.length)))
		.sort()
}

/**
 * Нарушения одного конфига; пустой список — конфиг в порядке. Файлы читает
 * `host`: так сторож проверяет и себя, на каталоге в памяти. Цепочку `extends`
 * разбирает сам TypeScript — звенья бывают JSONC, — и конфиг, который он не
 * разобрал, тоже нарушение: без пропавшего звена сторож судил бы неполные
 * опции.
 */
function checkSourcePaths(file: string, host: ts.ParseConfigHost): string[] {
	const { config, error } = ts.readConfigFile(file, (path) => host.readFile(path))

	if (error) {
		return [unparsed(error)]
	}

	const { options, errors } = ts.parseJsonConfigFileContent(
		config,
		host,
		posix.dirname(file),
		undefined,
		file,
	)
	const violations = errors.map(unparsed)
	const entries = Object.entries(options.paths ?? {})

	if (entries.length === 0) {
		return violations
	}

	const base = pathsBaseOf(options)

	for (const [key, targets] of entries) {
		for (const target of targets) {
			for (const hit of packageTargets(target, base, host)) {
				const chain = hit === target ? `"${target}"` : `"${target}" → "${hit}"`

				violations.push(`paths "${key}" → ${chain} — ${WHY}`)
			}
		}
	}

	return violations
}

/** Путь от корня репозитория через `/` — имя конфига в отчёте. */
function fromRoot(file: string): string {
	return relative(ROOT, file).split(sep).join('/')
}

/** Конфиги TypeScript репозитория — тем же обходом, которым TypeScript раскрывает `include`. */
const CONFIGS = ts.sys
	.readDirectory(ROOT, ['.json'], undefined, ['**/tsconfig*.json'])
	.map((file) => ({ file, name: fromRoot(file) }))

describe('пути к исходникам', () => {
	// Обход не вхолостую: в списке общий базовый конфиг, пакетные конфиги и тот,
	// на котором дефект нашли
	it('конфиги репозитория найдены', () => {
		expect(CONFIGS.map(({ name }) => name)).toEqual(
			expect.arrayContaining([
				'tsconfig.base.json',
				'packages/setup/tsconfig.json',
				'packages/ui/vue/tsconfig.json',
			]),
		)
	})

	describe.each(CONFIGS)('$name', ({ file, name }) => {
		it('paths не ведёт в каталог с package.json', () => {
			const violations = checkSourcePaths(file, ts.sys)

			expect(
				violations,
				`${name} разошёлся с AGENTS.md «Сборка пакетов» (цель paths — файл входа или каталог без манифеста):\n` +
					violations.join('\n'),
			).toEqual([])
		})
	})
})

describe('сторож путей к исходникам', () => {
	const PACKAGE = '/repo/packages/setup/tsconfig.json'

	/** Репозиторий в памяти: два пакета с манифестами — у одного исходники в `src`. */
	const REPO: Readonly<Record<string, string>> = {
		'/repo/packages/core/package.json': '{ "types": "./dist/index.d.ts" }',
		'/repo/packages/core/src/index.ts': '',
		'/repo/packages/setup/package.json': '{ "types": "./dist/index.d.ts" }',
		'/repo/packages/setup/index.ts': '',
	}

	/**
	 * Каталог в памяти: путь → текст файла. Обход отдаёт файлы под каталогом с
	 * нужным расширением, шаблонов `include` не разбирает: сторож отбирает
	 * манифесты по имени сам, а TypeScript без исходников счёл бы конфиг пустым
	 * (TS18003).
	 */
	const memoryHost = (files: Readonly<Record<string, string>>): ts.ParseConfigHost => ({
		useCaseSensitiveFileNames: true,
		fileExists: (path) => Object.hasOwn(files, path),
		readFile: (path) => files[path],
		readDirectory: (root, extensions) =>
			Object.keys(files).filter(
				(path) =>
					path.startsWith(`${root}/`) && extensions.some((ext) => path.endsWith(ext)),
			),
	})

	/** Текст конфига: объект пишется как JSON, строка — как есть. */
	const text = (config: unknown): string =>
		typeof config === 'string' ? config : JSON.stringify(config)

	/** Пакетный конфиг setup поверх общего базового, как в репозитории. */
	const check = (config: unknown, base: unknown = {}): string[] =>
		checkSourcePaths(
			PACKAGE,
			memoryHost({
				...REPO,
				'/repo/tsconfig.base.json': text(base),
				[PACKAGE]: text(config),
			}),
		)

	/** Пакетный конфиг с одними `paths` поверх общего базового. */
	const withPaths = (paths: Readonly<Record<string, readonly string[]>>): string[] =>
		check({ extends: '../../tsconfig.base.json', compilerOptions: { paths } })

	it('файл входа и каталог без манифеста — без нарушений', () => {
		expect(
			withPaths({ '@soldy-ui/core': ['../core/src'], '@soldy-ui/setup': ['./index.ts'] }),
		).toEqual([])
	})

	it('каталог пакета — нарушение, свой он или соседа', () => {
		expect(withPaths({ '@soldy-ui/setup': ['.'] })).toEqual([
			`paths "@soldy-ui/setup" → "." — ${WHY}`,
		])
		expect(withPaths({ '@soldy-ui/core': ['../core/', '../core/src'] })).toEqual([
			`paths "@soldy-ui/core" → "../core/" — ${WHY}`,
		])
	})

	// Цель считается от звена, которое объявило paths: от каталога проверяемого
	// конфига "./packages/setup" не назвал бы ничего
	it('paths из звена extends — от каталога этого звена', () => {
		const base = { compilerOptions: { paths: { '@soldy-ui/setup': ['./packages/setup'] } } }

		expect(check({ extends: '../../tsconfig.base.json' }, base)).toEqual([
			`paths "@soldy-ui/setup" → "./packages/setup" — ${WHY}`,
		])
	})

	it('шаблон — нарушение на каждый каталог пакета, в который ведёт подстановка', () => {
		expect(withPaths({ '@soldy-ui/*': ['../*'] })).toEqual([
			`paths "@soldy-ui/*" → "../*" → "../core" — ${WHY}`,
			`paths "@soldy-ui/*" → "../*" → "../setup" — ${WHY}`,
		])
		// Подстановка идёт и через «/»: `@repo/packages/core` → `../../packages/core`
		expect(withPaths({ '@repo/*': ['../../*'] })).toEqual([
			`paths "@repo/*" → "../../*" → "../../packages/core" — ${WHY}`,
			`paths "@repo/*" → "../../*" → "../../packages/setup" — ${WHY}`,
		])
		// Подпути пакета и каталоги исходников манифеста не несут
		expect(
			withPaths({ '@soldy-ui/setup/*': ['./*'], '@soldy-ui/src/*': ['../*/src'] }),
		).toEqual([])
	})

	// Без пропавшего звена сторож судил бы неполные опции
	it('конфиг, который TypeScript не разобрал, — нарушение', () => {
		expect(checkSourcePaths(PACKAGE, memoryHost(REPO))).toEqual([
			expect.stringMatching(/^не разобран: .*\/packages\/setup\/tsconfig\.json/),
		])
		expect(check('{ "compilerOptions": ')).toEqual([expect.stringMatching(/^не разобран: /)])
		expect(check({ extends: './tsconfig.missing.json' })).toEqual([
			expect.stringMatching(/^не разобран: .*tsconfig\.missing\.json/),
		])
	})
})
