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
 * Рецепт Svelte — один проход `svelte-package`. Компоненты `.svelte` уезжают
 * как написаны: скомпилированный компонент привязан к рантайму своей версии
 * Svelte, поэтому компилирует его приложение потребителя. `.ts` транспилируются
 * модуль в модуль, декларации выпускает тот же проход. Бандла нет, и проверки
 * общего рецепта к нему неприменимы — у него свои: вход и выход, конфиг
 * деклараций, ни одного `svelte.config` и условие `svelte` в `exports`.
 *
 * Общее у рецептов — конфиг деклараций `tsconfig.build.json`. `paths` у него
 * пуст (кроме ссылки пакета на самого себя) и нет `preserveSymlinks`: сосед
 * резолвится как пакет, по своему `dist/index.d.ts`. Пока это было иначе, `tsc`
 * читал соседа исходниками, и опубликованная поверхность адаптера этим не
 * проверялась вовсе.
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

/** Один проход: компоненты как написаны, `.ts` — в `.js`, декларации — тем же проходом. */
const SVELTE_RECIPE: TRecipe = { name: 'Svelte: svelte-package', tool: /\bsvelte-package\b/ }

const RECIPES: readonly TRecipe[] = [LIB_RECIPE, SVELTE_RECIPE]

/** Рецепты, чей инструмент есть в скрипте `build`. */
function recipesOf(build: string): TRecipe[] {
	return RECIPES.filter(({ tool }) => tool.test(build))
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

/** Команда `svelte-package` из скрипта — до следующей команды или конца строки. */
function svelteCommandOf(build: string): string {
	return build.match(/\bsvelte-package\b[^&|;]*/)?.[0] ?? ''
}

/**
 * Значение опции команды. `-i src`, `--input src` и `--input=src` читаются
 * одинаково — так их читает и сам `svelte-package`. Опции нет — `undefined`.
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
	const command = svelteCommandOf(pkg.build)
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
		it('прогон деклараций видит соседа пакетом, а не исходниками', () => {
			const config = readJson(join(pkg.dir, 'tsconfig.build.json'))
			const compilerOptions = isRecord(config) ? config.compilerOptions : undefined

			expect(isRecord(compilerOptions)).toBe(true)

			if (!isRecord(compilerOptions)) {
				return
			}

			const { paths } = compilerOptions
			const mapped = isRecord(paths) ? Object.keys(paths) : []

			// Ссылка пакета на самого себя допустима, соседа в paths быть не может:
			// по ней `tsc` прочитал бы его исходники и увёл бы туда декларации
			expect(mapped.filter((key) => key !== pkg.name)).toEqual([])
			// Держался за прежнее состояние, когда соседи отдавали src
			expect(compilerOptions.preserveSymlinks).toBeUndefined()
		})
	})

	describe.each(packagesOf(LIB_RECIPE))('общий рецепт · $name', (pkg) => {
		it('декларации собираются после бандла, тем же tsconfig.build.json', () => {
			const bundle = pkg.build.indexOf('vite build')
			const types = pkg.build.indexOf('tsconfig.build.json')

			expect(bundle).toBeGreaterThanOrEqual(0)
			// У Vite стоит emptyOutDir: обратный порядок стёр бы декларации
			expect(types).toBeGreaterThan(bundle)
			expect(existsSync(join(pkg.dir, 'tsconfig.build.json'))).toBe(true)
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
})

describe('сторож рецептов', () => {
	it('рецепт узнаётся по инструменту в скрипте build', () => {
		const lib = 'vite build -c vite.lib.config.ts && tsc -p tsconfig.build.json'
		const theme =
			'npm run build:css && vite build -c vite.setup.config.ts && tsc -p tsconfig.build.json'

		expect(recipesOf(lib)).toEqual([LIB_RECIPE])
		expect(recipesOf(theme)).toEqual([LIB_RECIPE])
		expect(recipesOf('svelte-package -i src -o dist')).toEqual([SVELTE_RECIPE])
		expect(recipesOf('tsc -p tsconfig.build.json')).toEqual([])
		expect(recipesOf('vite build && svelte-package')).toEqual([LIB_RECIPE, SVELTE_RECIPE])
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
})
