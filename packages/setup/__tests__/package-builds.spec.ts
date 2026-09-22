import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

/**
 * Сторож раздела «Сборка пакетов» (см. AGENTS.md). Наружу уезжает `dist`, и три
 * решения сборки — только ESM, модуль на модуль, без минификации — приняты один
 * раз, в общей фабрике `tools/vite/lib.config.ts`.
 *
 * Проверяется конфиг самого пакета, а не фабрика: своя копия расходится с ней
 * молча. У адаптера Vue такая копия пережила переименование скоупа
 * (`external: [/^@soldy\//]` перестал совпадать хоть с чем-нибудь), держала
 * формат `cjs` и складывала выход в `lib` мимо `dist`, объявленного в манифесте.
 *
 * Второе здесь же — прогон деклараций. У конфига сборки `paths` пуст (кроме
 * ссылки пакета на самого себя) и нет `preserveSymlinks`: сосед резолвится как
 * пакет, по своему `dist/index.d.ts`. Пока это было иначе, `tsc` читал соседа
 * исходниками, и опубликованная поверхность адаптера этим не проверялась вовсе.
 *
 * Список пакетов не хардкодится: это очередь корневого `build`, а каталог
 * пакета берётся по его ссылке воркспейса в `node_modules` — второго
 * соответствия «имя → путь» здесь нет. Что очередь полна и упорядочена,
 * проверяет `workspace-manifests.spec.ts`.
 */

const ROOT = resolve(__dirname, '../../..')

/** Собираемый пакет: имя из очереди, его каталог и его скрипт `build`. */
type TBuiltPackage = {
	readonly name: string
	readonly dir: string
	readonly build: string
}

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

const PACKAGES = builtPackages()

describe('сборка пакетов', () => {
	// Разбор не вхолостую: очередь непуста и адаптеры в ней есть
	it('очередь корневого build разобрана', () => {
		expect(PACKAGES.map(({ name }) => name)).toEqual(
			expect.arrayContaining(['@soldy-ui/core', '@soldy-ui/vue']),
		)
	})

	describe.each(PACKAGES)('$name', (pkg) => {
		it('декларации собираются после бандла, тем же tsconfig.build.json', () => {
			const bundle = pkg.build.indexOf('vite build')
			const types = pkg.build.indexOf('tsconfig.build.json')

			expect(bundle).toBeGreaterThanOrEqual(0)
			// У Vite стоит emptyOutDir: обратный порядок стёр бы декларации
			expect(types).toBeGreaterThan(bundle)
			expect(existsSync(join(pkg.dir, 'tsconfig.build.json'))).toBe(true)
		})

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
})
