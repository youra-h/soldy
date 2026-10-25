import { describe, it, expect } from 'vitest'
import { realpathSync } from 'node:fs'
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
 * Судятся только пакеты репозитория. Каталог, который на деле лежит в
 * `node_modules`, — внешняя зависимость, и манифест ей положен: стенд замеров
 * ведёт `@angular/*` в свои `node_modules`, чтобы фреймворк был одной копией.
 * Место берётся настоящее, после ссылок: пакет воркспейса в `node_modules` —
 * ссылка на каталог репозитория, и запись через `node_modules` его не прячет.
 *
 * Список конфигов не хардкодится: это каждый `tsconfig*.json` репозитория, и
 * находит их тот же обход, которым TypeScript раскрывает `include`, —
 * `node_modules` он пропускает.
 */

const ROOT = resolve(__dirname, '../../..')

/** Почему каталог пакета не годится в цель `paths`. */
const WHY = 'каталог с package.json: TypeScript разрешит его через манифест, то есть в dist'

/** Файлы конфигов и настоящее место каталога — после всех ссылок. */
type TRepoHost = ts.ParseConfigHost & { realpath(path: string): string }

/** Каталог — внешняя зависимость: его настоящий путь проходит через `node_modules`. */
function isDependency(dir: string, host: TRepoHost): boolean {
	return host.realpath(dir).split(/[\\/]/).includes('node_modules')
}

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
 * Подстановки цели, которые называют каталог пакета репозитория с
 * `package.json`, — как они записаны в конфиге. Точная цель — она сама. В
 * шаблоне `*` TypeScript заменяет любой строкой, `/` в том числе, поэтому
 * манифесты ищутся под неизменной частью шаблона, и каждый подошедший даёт свою
 * подстановку. Внешние зависимости не в счёт.
 */
function packageTargets(target: string, base: string, host: TRepoHost): string[] {
	const path = posix.join(base, target)
	const star = path.indexOf('*')

	if (star < 0) {
		return host.fileExists(posix.join(path, 'package.json')) && !isDependency(path, host)
			? [target]
			: []
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
				dir.endsWith(suffix) &&
				!isDependency(dir, host),
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
function checkSourcePaths(file: string, host: TRepoHost): string[] {
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

/** Репозиторий на диске: файлы читает TypeScript, настоящее место каталога даёт файловая система. */
const DISK: TRepoHost = {
	useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
	fileExists: (path) => ts.sys.fileExists(path),
	readFile: (path) => ts.sys.readFile(path),
	readDirectory: (root, extensions, excludes, includes, depth) =>
		ts.sys.readDirectory(root, extensions, excludes, includes, depth),
	realpath: (path) => realpathSync(path),
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
			const violations = checkSourcePaths(file, DISK)

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
	 * (TS18003). Ссылки — каталог → настоящее место: файлы под ссылкой
	 * перечисляются по её пути, как их видит обход.
	 */
	const memoryHost = (
		files: Readonly<Record<string, string>>,
		links: Readonly<Record<string, string>> = {},
	): TRepoHost => ({
		useCaseSensitiveFileNames: true,
		realpath: (path) => {
			const link = Object.entries(links).find(
				([from]) => path === from || path.startsWith(`${from}/`),
			)

			return link === undefined ? path : link[1] + path.slice(link[0].length)
		},
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

	describe('node_modules', () => {
		const STAND = '/repo/tools/bench/tsconfig.json'

		/**
		 * Стенд со своими зависимостями, как стенд замеров: фреймворк одной копией и
		 * пакет воркспейса — ссылкой на каталог репозитория.
		 */
		const standCheck = (paths: Readonly<Record<string, readonly string[]>>): string[] =>
			checkSourcePaths(
				STAND,
				memoryHost(
					{
						...REPO,
						'/repo/tools/bench/index.ts': '',
						'/repo/tools/bench/node_modules/rxjs/package.json': '{}',
						'/repo/tools/bench/node_modules/@angular/core/package.json': '{}',
						'/repo/tools/bench/node_modules/@angular/common/package.json': '{}',
						'/repo/tools/bench/node_modules/@soldy-ui/core/package.json':
							'{ "types": "./dist/index.d.ts" }',
						[STAND]: text({ compilerOptions: { paths } }),
					},
					{ '/repo/tools/bench/node_modules/@soldy-ui/core': '/repo/packages/core' },
				),
			)

		it('внешняя зависимость с манифестом — без нарушений', () => {
			expect(
				standCheck({
					'@angular/*': ['./node_modules/@angular/*'],
					rxjs: ['./node_modules/rxjs'],
					'rxjs/*': ['./node_modules/rxjs/*'],
				}),
			).toEqual([])
		})

		// Пакет воркспейса в node_modules — ссылка: судится каталог репозитория за ней
		it('пакет репозитория через node_modules — нарушение', () => {
			expect(standCheck({ '@soldy-ui/core': ['./node_modules/@soldy-ui/core'] })).toEqual([
				`paths "@soldy-ui/core" → "./node_modules/@soldy-ui/core" — ${WHY}`,
			])
			expect(standCheck({ '@soldy-ui/*': ['./node_modules/@soldy-ui/*'] })).toEqual([
				`paths "@soldy-ui/*" → "./node_modules/@soldy-ui/*" → "./node_modules/@soldy-ui/core" — ${WHY}`,
			])
		})
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
