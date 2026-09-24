import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { join, posix, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

/**
 * Сторож раздела «Сборка пакетов» (см. AGENTS.md). Наружу уезжает `dist`, а
 * собирает его один из двух рецептов — какой, видно по инструменту в скрипте
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

/** Собираемый пакет: имя из очереди, его каталог и его скрипт `build`. */
type TBuiltPackage = {
	readonly name: string
	readonly dir: string
	readonly build: string
}

/**
 * Файл из каталога пакета, разобранный как JSON; нет файла — `undefined`.
 * Сторож получает его функцией, а не ходит на диск сам: так он проверяет и
 * себя, на пакетах без диска.
 */
type TReadConfig = (file: string) => unknown

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readJson(path: string): unknown {
	return JSON.parse(readFileSync(path, 'utf-8'))
}

/** Скрипт манифеста — единственное, что от него нужно этому сторожу. */
function scriptOf(dir: string, name: string): string {
	const manifest = readJson(join(dir, 'package.json'))
	const scripts = isRecord(manifest) ? manifest.scripts : undefined
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
	const build = scriptOf(ROOT, 'build')

	return [...build.matchAll(/--workspace=(\S+)/g)].map(([, name]) => {
		const dir = realpathSync(resolve(ROOT, 'node_modules', name))

		return { name, dir, build: scriptOf(dir, 'build') }
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
 * ровно один: смесь двух — это третий рецепт, которого сторож не знает.
 */
type TRecipe = {
	readonly name: string
	readonly tool: RegExp
}

/** Бандл Vite по общей фабрике, затем прогон деклараций. */
const LIB_RECIPE: TRecipe = { name: 'общий: vite build, затем декларации', tool: /\bvite build\b/ }

/** Один проход: частичная форма Angular, FESM и свёрнутые декларации по APF. */
const NG_PACKAGR_RECIPE: TRecipe = { name: 'Angular: ng-packagr', tool: /\bng-packagr\b/ }

const RECIPES: readonly TRecipe[] = [LIB_RECIPE, NG_PACKAGR_RECIPE]

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

/** Путь без `./` в начале и `/` в конце: `./dist/` и `dist` — один каталог. */
function normalizePath(path: string): string {
	return posix.normalize(path).replace(/\/$/, '')
}

/** Команда `ng-packagr` из скрипта — до следующей команды или конца строки. */
function ngPackagrCommandOf(build: string): string {
	return build.match(/\bng-packagr\b[^&|;]*/)?.[0] ?? ''
}

/**
 * Значение опции команды. `-p ng-package.json`, `--project ng-package.json` и
 * `--project=ng-package.json` читаются одинаково — так их читает и сам
 * инструмент. Опции нет — `undefined`.
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

/**
 * Нарушения рецепта Angular; пустой список — пакет в порядке. Конфиги
 * названы в команде явно: без `-p` инструмент ищет `ng-package.json` сам, а
 * без `-c` собирает своим tsconfig, в котором нет ни настроек пакета, ни
 * частичной формы.
 */
function checkNgPackagrRecipe(pkg: TBuiltPackage, read: TReadConfig): string[] {
	const violations: string[] = []
	const command = ngPackagrCommandOf(pkg.build)
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
		expect(recipesOf(angular)).toEqual([NG_PACKAGR_RECIPE])
		expect(recipesOf('tsc -p tsconfig.build.json')).toEqual([])
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

	describe('рецепт Angular', () => {
		const BUILD = 'ng-packagr -p ng-package.json -c tsconfig.build.json'

		const angular = (build: string): TBuiltPackage => ({
			name: '@soldy-ui/example',
			dir: 'packages/example',
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
