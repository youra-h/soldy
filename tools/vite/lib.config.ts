import { defineConfig, type PluginOption, type UserConfig } from 'vite'
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
	const { name, root, entry, external = [], plugins = [] } = options

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
			outDir: 'dist',
			// Прогон деклараций идёт после сборки: обратный порядок стёр бы `.d.ts`
			emptyOutDir: true,
			// Библиотеку минифицирует сборщик приложения. Своя минификация только
			// коверкает имена классов, которыми подписаны ошибки сборки набора
			// («TAriaPlugin уже входит в состав TButton»)
			minify: false,
			lib: {
				entry: path.resolve(root, entry),
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
