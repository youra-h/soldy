import { defineConfig, type PluginOption, type UserConfig } from 'vite'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Общая фабрика библиотечной сборки пакета: JS собирает Vite, `.d.ts` — отдельный
 * прогон `tsc -p tsconfig.build.json` (см. AGENTS.md, «Сборка пакетов»).
 *
 * Одна фабрика на все пакеты, потому что копий конфига было бы по числу пакетов,
 * а расходятся они молча: `external: [/^@soldy\//]` у адаптера Vue пережил
 * переименование скоупа и перестал совпадать хоть с чем-нибудь.
 */

/** Опции сборки одного пакета: всё, чем пакеты друг от друга отличаются. */
export type TLibraryBuildOptions = {
	/** Имя пакета — его же имя в манифесте. */
	readonly name: string
	/** Корень пакета — каталог его `vite.lib.config.ts`. */
	readonly root: string
	/** Вход бандла от корня пакета. */
	readonly entry: string
	/**
	 * Куда складывать выход, от корня пакета. По умолчанию `dist` — так у
	 * пакета, у которого выход один.
	 *
	 * У пакета их бывает два: тема отдаёт и CSS (`dist/index.css`), и
	 * поведение (`dist/setup`). Каталог чистится (`emptyOutDir`), поэтому
	 * второй выход обязан лежать в своём, иначе он стёр бы первый.
	 */
	readonly outDir?: string
	/**
	 * Whether the subpaths of the manifest's `exports` are entries of the build
	 * too, each from its source (`subpathSources`). A module that is not an
	 * entry keeps only the exports other modules take from it, and a name the
	 * root takes by another path is dropped from the subpath that re-exports
	 * it; an entry keeps every export of its own.
	 */
	readonly subpaths?: boolean
	/**
	 * Чего не вбирать в бандл сверх соседей по скоупу: фреймворк адаптера и
	 * прочие зависимости, которые ставит потребитель.
	 */
	readonly external?: readonly (string | RegExp)[]
	readonly plugins?: PluginOption[]
}

/**
 * Соседний пакет в бандл не вбирается: реестры плагинов и расширений узнают тип
 * через `instanceof`, и вторая копия класса в приложении молча перестала бы
 * узнаваться (AGENTS.md, «Плагины и расширения снаружи»).
 */
const SCOPE = /^@soldy-ui\//

/** Совпадает ли спецификатор с зависимостью: сам пакет или его подпуть. */
function matches(specifier: string, pattern: string | RegExp): boolean {
	return typeof pattern === 'string'
		? specifier === pattern || specifier.startsWith(`${pattern}/`)
		: pattern.test(specifier)
}

export function libConfig(options: TLibraryBuildOptions): UserConfig {
	const {
		name,
		root,
		entry,
		outDir = 'dist',
		subpaths = false,
		external = [],
		plugins = [],
	} = options
	const main = path.resolve(root, entry)
	const entries = subpaths
		? [main, ...Object.values(subpathSources({ name, root, entry, outDir }))]
		: main

	return defineConfig({
		// Корень задан явно: `outDir` Vite считает от него, а не от конфига, и
		// прогон из корня репозитория складывал бы `dist` туда же
		root,
		plugins,
		resolve: {
			// Ядро ссылается на свою же бочку (`import { TEvented } from
			// '@soldy-ui/core'`). Себя пакет видит исходниками, иначе сборка
			// зависела бы от собственного прошлого выхода
			alias: { [name]: path.resolve(root, entry) },
		},
		build: {
			outDir,
			// Прогон деклараций идёт после сборки: обратный порядок стёр бы `.d.ts`
			emptyOutDir: true,
			// Библиотеку минифицирует сборщик приложения. Своя минификация только
			// коверкает имена классов, которыми подписаны ошибки сборки набора
			// («TAriaPlugin уже входит в состав TButton»)
			minify: false,
			lib: {
				entry: entries,
				// Только ESM: второй формат дал бы в одном приложении две копии
				// каждого класса, и `instanceof` реестров перестал бы совпадать
				formats: ['es'],
				fileName: () => 'index.js',
			},
			rollupOptions: {
				external: (specifier) =>
					!matches(specifier, name) &&
					[SCOPE, ...external].some((pattern) => matches(specifier, pattern)),
				output: {
					// Модуль на модуль, а не один файл: приложение с одной кнопкой
					// не обязано тащить Select. Слепленные в один файл пакеты
					// теряют это — дескрипторы и плагины остаются в бандле
					// целиком. Спецификаторы Rollup всё равно переписывает, ради
					// чего сборка и заведена
					preserveModules: true,
					preserveModulesRoot: path.dirname(path.resolve(root, entry)),
					entryFileNames: '[name].js',
				},
			},
		},
	})
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * The sources of a package's subpaths: the import path of every `exports` key
 * but `.` → the module its target is built from. The factory lays the build
 * out module for module from the folder of the entry, so the target
 * `./dist/components/button/index.js` is built from
 * `src/components/button/index.ts`.
 *
 * Tests and stands take a package from sources, its subpaths too
 * (docs/agents/build.md, «Локальная разработка сборки не требует»). An alias
 * is matched by prefix: these go before the alias of the package root.
 */
export function subpathSources(
	options: Pick<TLibraryBuildOptions, 'name' | 'root' | 'entry' | 'outDir'>,
): Record<string, string> {
	const { name, root, entry, outDir = 'dist' } = options
	const manifest: unknown = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf-8'))
	const exports = isRecord(manifest) && isRecord(manifest.exports) ? manifest.exports : {}
	const output = `./${outDir}/`
	const sources: Record<string, string> = {}

	for (const [subpath, conditions] of Object.entries(exports)) {
		if (subpath === '.') continue

		const target = isRecord(conditions) ? conditions.default : conditions
		const source =
			typeof target === 'string' && target.startsWith(output) && target.endsWith('.js')
				? path.resolve(
						root,
						path.dirname(entry),
						`${target.slice(output.length, -'.js'.length)}.ts`,
					)
				: undefined

		if (source === undefined || !existsSync(source)) {
			throw new Error(
				`${name}: exports["${subpath}"] ${JSON.stringify(target)} — not a module built from ${path.dirname(entry)}`,
			)
		}

		sources[path.posix.join(name, subpath)] = source
	}

	return sources
}
