import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { join, posix, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

/**
 * Сторож раздела «Сборка пакетов» (см. AGENTS.md). Наружу уезжает `dist`, а
 * собирает его один из трёх рецептов — какой, видно по инструменту в скрипте
 * `build` пакета.
 *
 * Общий рецепт — бандл Vite, затем прогон деклараций. Три его решения — только
 * ESM, модуль на модуль, без минификации — приняты один раз, в общей фабрике
 * `tools/vite/lib.config.ts`, а проверяется конфиг самого пакета: своя копия
 * расходится с фабрикой молча. У адаптера Vue такая копия пережила
 * переименование скоупа (`external: [/^@soldy\//]` перестал совпадать хоть с
 * чем-нибудь), держала формат `cjs` и складывала выход в `lib` мимо `dist`,
 * объявленного в манифесте.
 *
 * Рецепт Svelte — один проход `svelte-package`. Компоненты `.svelte` уезжают
 * как написаны: скомпилированный компонент привязан к рантайму своей версии
 * Svelte, поэтому компилирует его приложение потребителя. `.ts` транспилируются
 * модуль в модуль, декларации выпускает тот же проход. Бандла нет, и проверки
 * общего рецепта к нему неприменимы — у него свои: вход и выход, конфиг
 * деклараций, ни одного `svelte.config` и условие `svelte` в `exports`.
 *
 * Рецепт Angular — один проход `ng-packagr`. Библиотека Angular уезжает в
 * частичной форме: её дособирает компилятор приложения под свою версию Angular,
 * а полная форма привязана к версии, которой её собрали. Формат выхода задаёт
 * Angular Package Format — FESM и свёрнутые декларации, — поэтому проверки
 * бандла Vite к нему неприменимы. У рецепта свои: выход `dist` записан в
 * конфиге `-p`, частичная форма — в `tsconfig.build.json`.
 *
 * Общее у рецептов — `tsconfig.build.json`. `paths` объявлен в нём самом: без
 * ключа `extends` принёс бы `paths` пакетного конфига, ведущие соседей в
 * исходники, поэтому сторож читает файл, а не цепочку `extends`. Соседей в
 * `paths` нет (ссылка пакета на самого себя допустима), `preserveSymlinks` нет:
 * сосед резолвится как пакет, по своему собранному `dist`. Пока это было
 * иначе, сборка читала соседа исходниками, и опубликованная поверхность
 * адаптера этим не проверялась вовсе.
 *
 * Список пакетов не хардкодится: это очередь корневого `build`, а каталог
 * пакета берётся по его ссылке воркспейса в `node_modules` — второго
 * соответствия «имя → путь» здесь нет. Пакет очереди, который не подходит ни
 * под один рецепт, — нарушение: иначе его не проверило бы ничто. Что очередь
 * полна и упорядочена, проверяет `workspace-manifests.spec.ts`.
 */

const ROOT = resolve(__dirname, '../../..')

/** Манифест как есть: поля не принимаются на веру, а проверяются по одному. */
type TManifest = Readonly<Record<string, unknown>>

/** Собираемый пакет: имя из очереди, его каталог, манифест и скрипт `build`. */
type TBuiltPackage = {
	readonly name: string
	readonly dir: string
	readonly manifest: TManifest
	readonly build: string
}

/**
 * Файл из каталога пакета, разобранный как JSON; нет файла — `undefined`.
 * Сторож получает его функцией, а не ходит на диск сам: так он проверяет и
 * себя, на пакетах без диска.
 */
type TReadConfig = (file: string) => unknown

function isRecord(value: unknown): value is TManifest {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readJson(path: string): unknown {
	return JSON.parse(readFileSync(path, 'utf-8'))
}

function readManifest(dir: string): TManifest {
	const manifest = readJson(join(dir, 'package.json'))

	if (!isRecord(manifest)) {
		throw new Error(`${dir}/package.json: ожидается объект JSON`)
	}

	return manifest
}

/** Скрипт манифеста по имени: нет скрипта — собирать пакет нечем. */
function scriptOf(manifest: TManifest, dir: string, name: string): string {
	const { scripts } = manifest
	const script = isRecord(scripts) ? scripts[name] : undefined

	if (typeof script !== 'string') {
		throw new Error(`В ${dir}/package.json нет скрипта ${name}`)
	}

	return script
}

/**
 * Очередь корневого `build` — имена в порядке вызова. Каталог пакета берётся
 * через его ссылку воркспейса в `node_modules`: npm заводит её на каждый
 * воркспейс, и держать своё соответствие имён путям не нужно.
 */
function builtPackages(): TBuiltPackage[] {
	const build = scriptOf(readManifest(ROOT), ROOT, 'build')

	return [...build.matchAll(/--workspace=(\S+)/g)].map(([, name]) => {
		const dir = realpathSync(resolve(ROOT, 'node_modules', name))
		const manifest = readManifest(dir)

		return { name, dir, manifest, build: scriptOf(manifest, dir, 'build') }
	})
}

/** Конфиг из каталога пакета: JSON файла или `undefined`, если файла нет. */
function readConfigOf(pkg: TBuiltPackage): TReadConfig {
	return (file) => {
		const path = join(pkg.dir, file)

		return existsSync(path) ? readJson(path) : undefined
	}
}

/**
 * Рецепт сборки узнаётся по инструменту в скрипте `build`. Подходит у пакета
 * ровно один: смесь двух — это рецепт, которого сторож не знает.
 */
type TRecipe = {
	readonly name: string
	readonly tool: RegExp
}

/** Бандл Vite по общей фабрике, затем прогон деклараций. */
const LIB_RECIPE: TRecipe = { name: 'общий: vite build, затем декларации', tool: /\bvite build\b/ }

/** Один проход: компоненты как написаны, `.ts` — в `.js`, декларации — тем же проходом. */
const SVELTE_RECIPE: TRecipe = { name: 'Svelte: svelte-package', tool: /\bsvelte-package\b/ }

/** Один проход: частичная форма Angular, FESM и свёрнутые декларации по APF. */
const NG_PACKAGR_RECIPE: TRecipe = { name: 'Angular: ng-packagr', tool: /\bng-packagr\b/ }

const RECIPES: readonly TRecipe[] = [LIB_RECIPE, SVELTE_RECIPE, NG_PACKAGR_RECIPE]

/** Рецепты, чей инструмент есть в скрипте `build`. */
function recipesOf(build: string): TRecipe[] {
	return RECIPES.filter(({ tool }) => tool.test(build))
}

/**
 * Нарушения конфига `tsconfig.build.json`; пустой список — конфиг в порядке.
 * Читается сам файл, а не цепочка `extends`: ключ, которого в файле нет,
 * пришёл бы из пакетного конфига — у него `paths` ведут соседей в исходники.
 */
function checkBuildTsconfig(name: string, config: unknown): string[] {
	const violations: string[] = []
	const compilerOptions = isRecord(config) ? config.compilerOptions : undefined
	const options = isRecord(compilerOptions) ? compilerOptions : {}
	const { paths, preserveSymlinks } = options

	if (!isRecord(paths)) {
		violations.push(
			'paths не объявлен в самом файле — extends принёс бы paths пакетного конфига, ведущие соседей в исходники',
		)
	} else {
		// Ссылка пакета на самого себя допустима, соседа в paths быть не может:
		// по ней сборка прочитала бы его исходники и увела бы туда декларации
		for (const key of Object.keys(paths).filter((key) => key !== name)) {
			violations.push(
				`paths знает соседа ${key} — сосед резолвится как пакет, по своему dist`,
			)
		}
	}

	// Держался за прежнее состояние, когда соседи отдавали src
	if (preserveSymlinks !== undefined) {
		violations.push(
			`preserveSymlinks ${JSON.stringify(preserveSymlinks)} — сосед резолвится как пакет, по своему dist`,
		)
	}

	return violations
}

/**
 * Раздел `build` конфига Vite, который зовёт скрипт `build` пакета
 * (`vite build -c <файл>`).
 */
async function buildSectionOf(pkg: TBuiltPackage): Promise<Readonly<Record<string, unknown>>> {
	const match = pkg.build.match(/vite build -c (\S+)/)

	if (!match) {
		throw new Error(`В скрипте build пакета ${pkg.name} нет «vite build -c <конфиг>»`)
	}

	const module: unknown = await import(pathToFileURL(resolve(pkg.dir, match[1])).href)
	const config = isRecord(module) ? module.default : undefined
	const build = isRecord(config) ? config.build : undefined

	if (!isRecord(build)) {
		throw new Error(`${match[1]} пакета ${pkg.name} не отдаёт раздела build`)
	}

	return build
}

/**
 * Имена конфига Svelte у всех, кто его ищет: списки расширений у
 * `svelte-package`, плагина Svelte и `svelte-check` разные, и сторож берёт их
 * объединение.
 */
const SVELTE_CONFIGS = ['js', 'cjs', 'mjs', 'ts', 'cts', 'mts'].map((ext) => `svelte.config.${ext}`)

/** Путь без `./` в начале и `/` в конце: `./dist/` и `dist` — один каталог. */
function normalizePath(path: string): string {
	return posix.normalize(path).replace(/\/$/, '')
}

/** Команда инструмента из скрипта — до следующей команды или конца строки. */
function commandOf(build: string, tool: RegExp): string {
	return build.match(new RegExp(`${tool.source}[^&|;]*`))?.[0] ?? ''
}

/**
 * Значение опции команды. `-i src`, `--input src` и `--input=src` читаются
 * одинаково — так их читают и сами инструменты. Опции нет — `undefined`.
 */
function optionOf(command: string, ...names: readonly string[]): string | undefined {
	for (const name of names) {
		const match = command.match(new RegExp(`(?:^|\\s)${name}(?:=|\\s+)(\\S+)`))

		if (match) {
			return match[1]
		}
	}

	return undefined
}

/** Условие `svelte` в `exports["."]`; нет его — `undefined`. */
function svelteConditionOf(manifest: TManifest): unknown {
	const { exports } = manifest
	const root = isRecord(exports) ? exports['.'] : undefined

	return isRecord(root) ? root.svelte : undefined
}

/**
 * Нарушения рецепта Svelte; пустой список — пакет в порядке. Есть ли файл в
 * каталоге пакета, отвечает `exists`: так сторож проверяет и себя, на пакетах
 * без диска.
 */
function checkSvelteRecipe(pkg: TBuiltPackage, exists: (file: string) => boolean): string[] {
	const violations: string[] = []
	const command = commandOf(pkg.build, SVELTE_RECIPE.tool)
	const input = optionOf(command, '-i', '--input')
	const output = optionOf(command, '-o', '--output')
	const tsconfig = optionOf(command, '--tsconfig')
	const types = optionOf(command, '-t', '--types')
	const condition = svelteConditionOf(pkg.manifest)

	// Без опции вход — `src/lib`, как у приложения SvelteKit: у пакета его нет
	if (input === undefined || normalizePath(input) !== 'src') {
		violations.push(`вход ${JSON.stringify(input)}, ожидается -i src`)
	}

	// Манифест обещает `dist`: выход мимо него никем не читается. Выход записан
	// явно — на умолчание инструмента сторож не полагается
	if (output === undefined || normalizePath(output) !== 'dist') {
		violations.push(`выход ${JSON.stringify(output)}, ожидается -o dist`)
	}

	// Без опции инструмент берёт ближайший tsconfig.json, а его `paths` ведут
	// соседей в исходники
	if (tsconfig === undefined || normalizePath(tsconfig) !== 'tsconfig.build.json') {
		violations.push(
			`конфиг деклараций ${JSON.stringify(tsconfig)}, ожидается --tsconfig tsconfig.build.json`,
		)
	} else if (!exists('tsconfig.build.json')) {
		violations.push('нет tsconfig.build.json')
	}

	if (/(?:^|\s)--no-types(?=\s|$)/.test(command) || types === 'false') {
		violations.push('декларации выключены, а другого прохода для них нет')
	}

	// Конфиг подхватили бы разом сборка, плагин Svelte в тестах и `svelte-check`,
	// и его препроцессор отдал бы наружу не то, что проверили тесты
	for (const config of SVELTE_CONFIGS) {
		if (exists(config)) {
			violations.push(
				`${config} — компоненты уезжают как написаны, конфига Svelte у пакета нет`,
			)
		}
	}

	// По условию `svelte` плагин Svelte у потребителя узнаёт библиотеку и сам
	// компилирует её компоненты
	if (typeof condition !== 'string') {
		violations.push('exports["."] без условия svelte — плагин Svelte не узнает библиотеку')
	} else if (!normalizePath(condition).startsWith('dist/')) {
		violations.push(
			`exports["."]["svelte"] ${JSON.stringify(condition)} — мимо выхода сборки dist`,
		)
	}

	return violations
}

/**
 * Нарушения рецепта Angular; пустой список — пакет в порядке. Конфиги
 * названы в команде явно: без `-p` инструмент ищет `ng-package.json` сам, а
 * без `-c` собирает своим tsconfig, в котором нет ни настроек пакета, ни
 * частичной формы.
 */
function checkNgPackagrRecipe(pkg: TBuiltPackage, read: TReadConfig): string[] {
	const violations: string[] = []
	const command = commandOf(pkg.build, NG_PACKAGR_RECIPE.tool)
	const project = optionOf(command, '-p', '--project')
	const tsconfig = optionOf(command, '-c', '--config')

	if (project === undefined) {
		violations.push('конфиг пакета не назван, ожидается -p ng-package.json')
	} else {
		const file = normalizePath(project)
		const config = read(file)
		const dest = isRecord(config) ? config.dest : undefined

		if (config === undefined) {
			violations.push(`нет ${file}`)
		} else if (typeof dest !== 'string' || normalizePath(dest) !== 'dist') {
			// Манифест обещает `dist`: выход мимо него никем не читается. Выход
			// записан явно — на умолчание инструмента сторож не полагается
			violations.push(`dest ${JSON.stringify(dest)} в ${file}, ожидается "dist"`)
		}
	}

	if (tsconfig === undefined || normalizePath(tsconfig) !== 'tsconfig.build.json') {
		violations.push(
			`конфиг сборки ${JSON.stringify(tsconfig)}, ожидается -c tsconfig.build.json`,
		)
	} else {
		const config = read('tsconfig.build.json')
		const angular = isRecord(config) ? config.angularCompilerOptions : undefined
		const mode = isRecord(angular) ? angular.compilationMode : undefined

		if (config === undefined) {
			violations.push('нет tsconfig.build.json')
		} else if (mode !== 'partial') {
			// Без ключа ng-packagr собирает полную форму: она привязана к версии
			// Angular, которой её собрали, и в чужом приложении не заведётся
			violations.push(
				`compilationMode ${JSON.stringify(mode)} в tsconfig.build.json, ожидается "partial"`,
			)
		}
	}

	return violations
}

const PACKAGES = builtPackages()

/** Пакеты очереди, которые собирает рецепт. */
function packagesOf(recipe: TRecipe): TBuiltPackage[] {
	return PACKAGES.filter(({ build }) => recipe.tool.test(build))
}

describe('сборка пакетов', () => {
	// Разбор не вхолостую: очередь непуста, адаптеры в ней есть, и у каждого
	// рецепта есть пакет — иначе его проверки молча не запускались бы вовсе
	it('очередь корневого build разобрана', () => {
		expect(PACKAGES.map(({ name }) => name)).toEqual(
			expect.arrayContaining(['@soldy-ui/core', '@soldy-ui/vue']),
		)

		for (const recipe of RECIPES) {
			expect(packagesOf(recipe), recipe.name).not.toEqual([])
		}
	})

	it('каждый пакет очереди собирается ровно одним рецептом', () => {
		const violations = PACKAGES.flatMap(({ name, build }) => {
			const recipes = recipesOf(build)

			return recipes.length === 1
				? []
				: [`${name}: «${build}» — рецептов ${recipes.length}, ожидается один`]
		})

		expect(
			violations,
			`Скрипт build разошёлся с рецептами AGENTS.md «Сборка пакетов» (${RECIPES.map(({ name }) => name).join('; ')}):\n` +
				violations.join('\n'),
		).toEqual([])
	})

	describe.each(PACKAGES)('$name', (pkg) => {
		it('сборка видит соседа пакетом, а не исходниками', () => {
			const config = readConfigOf(pkg)('tsconfig.build.json')

			expect(config, `нет ${pkg.dir}/tsconfig.build.json`).toBeDefined()

			const violations = checkBuildTsconfig(pkg.name, config)

			expect(
				violations,
				'tsconfig.build.json разошёлся с AGENTS.md «Сборка пакетов»:\n' +
					violations.join('\n'),
			).toEqual([])
		})
	})

	describe.each(packagesOf(LIB_RECIPE))('общий рецепт · $name', (pkg) => {
		it('декларации собираются после бандла, тем же tsconfig.build.json', () => {
			const bundle = pkg.build.indexOf('vite build')
			const types = pkg.build.indexOf('tsconfig.build.json')

			expect(bundle).toBeGreaterThanOrEqual(0)
			// У Vite стоит emptyOutDir: обратный порядок стёр бы декларации
			expect(types).toBeGreaterThan(bundle)
		})

		it('бандл — только ESM, модуль на модуль, без минификации, в dist', async () => {
			const build = await buildSectionOf(pkg)

			// Второй формат дал бы в приложении две копии каждого класса, и
			// `instanceof` реестров перестал бы совпадать
			expect(build.lib).toMatchObject({ formats: ['es'] })
			// Минификация коверкает имена классов, которыми подписаны ошибки сборки
			expect(build.minify).toBe(false)
			expect(build.emptyOutDir).toBe(true)
			// Манифест обещает `dist`: выход мимо него никем не читается
			expect(build.outDir).toMatch(/^dist(\/|$)/)

			const rollupOptions = isRecord(build.rollupOptions) ? build.rollupOptions : {}
			const { output } = rollupOptions

			expect(Array.isArray(output)).toBe(false)
			// Склеенный в один файл пакет теряет tree-shaking целиком
			expect(output).toMatchObject({ preserveModules: true })
		})
	})

	describe.each(packagesOf(SVELTE_RECIPE))('рецепт Svelte · $name', (pkg) => {
		it('компоненты — как написаны, декларации — тем же проходом, выход — в dist', () => {
			const violations = checkSvelteRecipe(pkg, (file) => existsSync(join(pkg.dir, file)))

			expect(
				violations,
				'Сборка разошлась с рецептом Svelte (AGENTS.md, «Сборка пакетов»):\n' +
					violations.join('\n'),
			).toEqual([])
		})
	})

	describe.each(packagesOf(NG_PACKAGR_RECIPE))('рецепт Angular · $name', (pkg) => {
		it('частичная форма, конфиги названы явно, выход — в dist', () => {
			const violations = checkNgPackagrRecipe(pkg, readConfigOf(pkg))

			expect(
				violations,
				'Сборка разошлась с рецептом Angular (AGENTS.md, «Сборка пакетов»):\n' +
					violations.join('\n'),
			).toEqual([])
		})
	})
})

describe('сторож рецептов', () => {
	it('рецепт узнаётся по инструменту в скрипте build', () => {
		const lib = 'vite build -c vite.lib.config.ts && tsc -p tsconfig.build.json'
		const theme =
			'npm run build:css && vite build -c vite.setup.config.ts && tsc -p tsconfig.build.json'
		const angular = 'ng-packagr -p ng-package.json -c tsconfig.build.json'

		expect(recipesOf(lib)).toEqual([LIB_RECIPE])
		expect(recipesOf(theme)).toEqual([LIB_RECIPE])
		expect(recipesOf('svelte-package -i src -o dist')).toEqual([SVELTE_RECIPE])
		expect(recipesOf(angular)).toEqual([NG_PACKAGR_RECIPE])
		expect(recipesOf('tsc -p tsconfig.build.json')).toEqual([])
		expect(recipesOf('vite build && svelte-package')).toEqual([LIB_RECIPE, SVELTE_RECIPE])
		expect(recipesOf('vite build && ng-packagr')).toEqual([LIB_RECIPE, NG_PACKAGR_RECIPE])
	})

	describe('tsconfig.build.json', () => {
		const NAME = '@soldy-ui/example'
		const WHY = 'сосед резолвится как пакет, по своему dist'

		it('пустые paths и ссылка пакета на себя — без нарушений', () => {
			const self = { compilerOptions: { paths: { [NAME]: ['./src'] } } }

			expect(checkBuildTsconfig(NAME, { compilerOptions: { paths: {} } })).toEqual([])
			expect(checkBuildTsconfig(NAME, self)).toEqual([])
		})

		// Пакетный конфиг ведёт соседей в исходники, и extends принёс бы его paths
		it('paths не объявлен в самом файле — нарушение', () => {
			const inherited = {
				extends: './tsconfig.json',
				compilerOptions: { noEmit: false },
			}
			const why =
				'paths не объявлен в самом файле — extends принёс бы paths пакетного конфига, ведущие соседей в исходники'

			expect(checkBuildTsconfig(NAME, inherited)).toEqual([why])
			expect(checkBuildTsconfig(NAME, { extends: './tsconfig.json' })).toEqual([why])
		})

		it('сосед в paths или preserveSymlinks — нарушение', () => {
			const neighbour = { compilerOptions: { paths: { '@soldy-ui/core': ['../core/src'] } } }
			const symlinks = { compilerOptions: { paths: {}, preserveSymlinks: true } }

			expect(checkBuildTsconfig(NAME, neighbour)).toEqual([
				`paths знает соседа @soldy-ui/core — ${WHY}`,
			])
			expect(checkBuildTsconfig(NAME, symlinks)).toEqual([`preserveSymlinks true — ${WHY}`])
		})
	})

	describe('рецепт Svelte', () => {
		const BUILD = 'svelte-package -i src -o dist --tsconfig tsconfig.build.json'

		const ENTRY: TManifest = {
			types: './dist/index.d.ts',
			svelte: './dist/index.js',
			default: './dist/index.js',
		}

		const svelte = (build: string, entry: TManifest = ENTRY): TBuiltPackage => ({
			name: '@soldy-ui/example',
			dir: 'packages/example',
			manifest: { name: '@soldy-ui/example', exports: { '.': entry } },
			build,
		})

		/** Каталог пакета: конфиг деклараций и то, что дали сверх него. */
		const files =
			(...extra: string[]) =>
			(file: string): boolean =>
				['tsconfig.build.json', ...extra].includes(file)

		it('пакет по рецепту — без нарушений, как ни запиши опции', () => {
			const spelled =
				'svelte-package --input=./src --output dist/ --tsconfig=./tsconfig.build.json --types'

			expect(checkSvelteRecipe(svelte(BUILD), files())).toEqual([])
			expect(checkSvelteRecipe(svelte(spelled), files())).toEqual([])
		})

		it('без --tsconfig — нарушение: декларации ушли бы по tsconfig.json', () => {
			expect(checkSvelteRecipe(svelte('svelte-package -i src -o dist'), files())).toEqual([
				'конфиг деклараций undefined, ожидается --tsconfig tsconfig.build.json',
			])
		})

		it('конфиг деклараций назван, а файла нет — нарушение', () => {
			expect(checkSvelteRecipe(svelte(BUILD), () => false)).toEqual([
				'нет tsconfig.build.json',
			])
		})

		it('svelte.config у пакета — нарушение под любым расширением', () => {
			const why = '— компоненты уезжают как написаны, конфига Svelte у пакета нет'

			for (const config of SVELTE_CONFIGS) {
				expect(checkSvelteRecipe(svelte(BUILD), files(config)), config).toEqual([
					`${config} ${why}`,
				])
			}
		})

		it('декларации выключены — нарушение в любой записи', () => {
			for (const flag of ['--no-types', '--types false', '--types=false', '-t false']) {
				expect(checkSvelteRecipe(svelte(`${BUILD} ${flag}`), files()), flag).toEqual([
					'декларации выключены, а другого прохода для них нет',
				])
			}
		})

		it('вход не src, выход не dist — нарушение на каждый', () => {
			const defaults = 'svelte-package --tsconfig tsconfig.build.json'
			const moved = 'svelte-package -i src/lib -o build --tsconfig tsconfig.build.json'

			expect(checkSvelteRecipe(svelte(defaults), files())).toEqual([
				'вход undefined, ожидается -i src',
				'выход undefined, ожидается -o dist',
			])
			expect(checkSvelteRecipe(svelte(moved), files())).toEqual([
				'вход "src/lib", ожидается -i src',
				'выход "build", ожидается -o dist',
			])
		})

		it('опции соседней команды не в счёт', () => {
			const chained = 'svelte-package --tsconfig tsconfig.build.json && cp -i src -o dist'

			expect(checkSvelteRecipe(svelte(chained), files())).toEqual([
				'вход undefined, ожидается -i src',
				'выход undefined, ожидается -o dist',
			])
		})

		it('без условия svelte или с ним мимо dist — нарушение', () => {
			const { svelte: _condition, ...withoutCondition } = ENTRY

			expect(checkSvelteRecipe(svelte(BUILD, withoutCondition), files())).toEqual([
				'exports["."] без условия svelte — плагин Svelte не узнает библиотеку',
			])
			expect(
				checkSvelteRecipe(svelte(BUILD, { ...ENTRY, svelte: './src/index.ts' }), files()),
			).toEqual(['exports["."]["svelte"] "./src/index.ts" — мимо выхода сборки dist'])
		})
	})

	describe('рецепт Angular', () => {
		const BUILD = 'ng-packagr -p ng-package.json -c tsconfig.build.json'

		const angular = (build: string): TBuiltPackage => ({
			name: '@soldy-ui/example',
			dir: 'packages/example',
			manifest: { name: '@soldy-ui/example' },
			build,
		})

		/** Каталог пакета: конфиги по рецепту и то, что поверх них дали. */
		const files =
			(overrides: Readonly<Record<string, unknown>> = {}): TReadConfig =>
			(file) =>
				({
					'ng-package.json': { dest: 'dist', lib: { entryFile: 'src/index.ts' } },
					'tsconfig.build.json': {
						extends: './tsconfig.json',
						compilerOptions: { noEmit: false, paths: {} },
						angularCompilerOptions: { compilationMode: 'partial' },
					},
					...overrides,
				})[file]

		it('пакет по рецепту — без нарушений, как ни запиши опции', () => {
			const spelled = 'ng-packagr --project=./ng-package.json --config ./tsconfig.build.json'

			expect(checkNgPackagrRecipe(angular(BUILD), files())).toEqual([])
			expect(checkNgPackagrRecipe(angular(spelled), files())).toEqual([])
		})

		it('без -p и -c — нарушение на каждый', () => {
			expect(checkNgPackagrRecipe(angular('ng-packagr'), files())).toEqual([
				'конфиг пакета не назван, ожидается -p ng-package.json',
				'конфиг сборки undefined, ожидается -c tsconfig.build.json',
			])
		})

		it('конфиги названы, а файлов нет — нарушение на каждый', () => {
			expect(checkNgPackagrRecipe(angular(BUILD), () => undefined)).toEqual([
				'нет ng-package.json',
				'нет tsconfig.build.json',
			])
		})

		it('выход не dist или не записан — нарушение', () => {
			const moved = files({ 'ng-package.json': { dest: '../../dist/angular' } })
			const implicit = files({ 'ng-package.json': { lib: { entryFile: 'src/index.ts' } } })

			expect(checkNgPackagrRecipe(angular(BUILD), moved)).toEqual([
				'dest "../../dist/angular" в ng-package.json, ожидается "dist"',
			])
			expect(checkNgPackagrRecipe(angular(BUILD), implicit)).toEqual([
				'dest undefined в ng-package.json, ожидается "dist"',
			])
		})

		// Без ключа ng-packagr с конфигом пакета собирает полную форму
		it('полная форма или форма не записана — нарушение', () => {
			const full = files({
				'tsconfig.build.json': {
					compilerOptions: { paths: {} },
					angularCompilerOptions: { compilationMode: 'full' },
				},
			})
			const implicit = files({ 'tsconfig.build.json': { compilerOptions: { paths: {} } } })

			expect(checkNgPackagrRecipe(angular(BUILD), full)).toEqual([
				'compilationMode "full" в tsconfig.build.json, ожидается "partial"',
			])
			expect(checkNgPackagrRecipe(angular(BUILD), implicit)).toEqual([
				'compilationMode undefined в tsconfig.build.json, ожидается "partial"',
			])
		})

		it('опции соседней команды не в счёт', () => {
			const chained = 'ng-packagr && cp -p ng-package.json -c tsconfig.build.json'

			expect(checkNgPackagrRecipe(angular(chained), files())).toEqual([
				'конфиг пакета не назван, ожидается -p ng-package.json',
				'конфиг сборки undefined, ожидается -c tsconfig.build.json',
			])
		})
	})
})
