import path from 'node:path'
import { Worker } from 'node:worker_threads'
import { transformAsync } from '@babel/core'
import { needsLinking } from '@angular/compiler-cli/linker'
import { normalizePath, type Plugin } from 'vite'
import type { TCompilation, TCompileInput } from './vite-angular-compile.ts'

/**
 * Angular на стенде — компилятором Angular, без JIT.
 *
 * Шаблоны Angular компилирует только его собственный компилятор (AOT):
 * сигнальные входы и запросы без его преобразований JIT не видит. Поэтому хост
 * Angular и исходники адаптера стенд собирает программой Angular
 * (`NgtscProgram`), как `ngc`, а пакеты самого Angular, выпущенные в частичной
 * форме (`ɵɵngDeclare*`), доводит до полной линкером
 * (`@angular/compiler-cli/linker/babel` — так Angular советует встраивать его в
 * сборку мимо своего CLI). Компилятора Angular в рантайме стенда нет ни в
 * dev-сервере, ни в jsdom, ни в браузерном прогоне: без линкера пакеты Angular
 * потребовали бы его на первом же импорте.
 *
 * Готовый `@analogjs/vite-plugin-angular` здесь не подошёл. Пакеты Angular он
 * линкует через закрытое API `@angular/build`, вариант которого выбирает по
 * версии компилятора: у Angular 22.1 с `@angular/build` 22.2 (на Vite 8.3, как
 * стенд) линковка падает на первом же пакете, а `@angular/build` 22.1 везёт с
 * собой Vite 8.1. В Vitest предсборку он не линкует — там он рассчитывает на
 * JIT, — а прогон jsdom переводит на `vmThreads`.
 */

/** Плагин Angular стенда. */
export type TAngularOptions = {
	/**
	 * Программа Angular — `tsconfig.json` хоста, тот же, что проверяет `ngc`. В
	 * программу через `paths` входят адаптер и соседи.
	 */
	readonly tsconfig: string
	/**
	 * Что компилирует Angular — хост и исходники адаптера. Остальной TypeScript
	 * программы (ядро, setup, общий пакет стенда) компилирует сам Vite, как для
	 * остальных хостов: модуль у них с Angular общий.
	 */
	readonly include: readonly RegExp[]
}

/** JS зависимостей — кандидат в линкер: частичная форма бывает только у пакетов. */
const DEPENDENCY = /[\\/]node_modules[\\/].+\.m?js(?:\?|$)/

/** Путь модуля без запроса — ключ выхода. */
function fileOf(id: string): string {
	return normalizePath(id.split('?', 1)[0])
}

/**
 * Программа Angular целиком — в своём потоке (`src/vite-angular-compile.ts`):
 * компилятор синхронный, и в потоке сервера он на всё время компиляции
 * останавливал бы ответы модулей, а в браузерном прогоне — и RPC тестов.
 *
 * Падение потока — тоже итог компиляции, с ошибкой: её покажет модуль Angular,
 * которому нужен выход, как и ошибку самой программы.
 */
function compile(input: TCompileInput): Promise<TCompilation> {
	return new Promise((resolve) => {
		const worker = new Worker(new URL('./vite-angular-compile.ts', import.meta.url), {
			workerData: input,
		})
		const failed = (errors: string) =>
			resolve({ outputs: new Map(), files: new Set(), resources: new Map(), errors })

		worker.once('message', resolve)
		worker.once('error', (error) =>
			failed(
				`[playground] компиляция Angular упала: ${error instanceof Error ? error.stack : String(error)}`,
			),
		)
		worker.once('exit', (code) =>
			failed(`[playground] компиляция Angular вышла с кодом ${code}, не ответив`),
		)
	})
}

/**
 * Линкер — именем модуля, как его подключают в конфиге Babel: Babel загрузит
 * его сам. Импорт отдал бы плагин с типами Babel из зависимостей
 * `@angular/compiler-cli`, а у стенда свой Babel той же версии 8 — типы двух
 * копий друг с другом не сходятся, хотя сами объекты совместимы.
 */
const LINKER = '@angular/compiler-cli/linker/babel'

/**
 * Пакет Angular в частичной форме — в полную, линкером. Остальной JS
 * зависимостей проходит как есть: проверка `needsLinking` дешевле разбора.
 */
async function link(code: string, id: string) {
	const file = id.split('?', 1)[0]

	if (!needsLinking(file, code)) return null

	const result = await transformAsync(code, {
		filename: file,
		// Откуда Babel ищет линкер по имени: из пакета стенда
		cwd: import.meta.dirname,
		configFile: false,
		babelrc: false,
		compact: false,
		sourceMaps: true,
		plugins: [LINKER],
	})

	if (!result?.code) throw new Error(`[playground] линкер Angular не вернул код ${file}`)

	// Карта Babel — с полями только для чтения, Vite ждёт изменяемые: строкой
	// она подходит, и её разберёт сам Vite
	return { code: result.code, map: result.map ? JSON.stringify(result.map) : null }
}

/**
 * Плагины Angular: компилятор хоста и адаптера и линкер пакетов Angular.
 *
 * Линкер нужен там, где пакеты Angular проходят через Vite: в сборке и в jsdom
 * — его преобразованием (jsdom пропускает их через Vite, `server.deps.inline`
 * в `vitest.config.ts`), а в dev-сервере и браузерном прогоне пакеты собирает
 * предсборка Vite, и линкер стоит и в ней.
 *
 * Правка файла Angular в dev-сервере пересобирает программу: выход любого
 * модуля Angular мог смениться — шаблон компонента компилируется в код тех,
 * кто его использует, — поэтому снимаются все модули Angular и страница
 * перезагружается. Правка остального TypeScript программы — ядра, соседей —
 * делает программу устаревшей, а модули обновляет сам Vite.
 */
export function angular({ tsconfig, include }: TAngularOptions): Plugin[] {
	const compiled = (file: string) => include.some((pattern) => pattern.test(file))
	const project = normalizePath(path.resolve(tsconfig))

	let pending: Promise<TCompilation> | null = null
	let last: TCompilation | null = null

	const compilation = (): Promise<TCompilation> =>
		(pending ??= compile({ tsconfig, include }).then((result) => (last = result)))

	const linker: Plugin = {
		name: 'playground:angular-linker',
		transform: { filter: { id: DEPENDENCY }, handler: link },
	}

	const compiler: Plugin = {
		name: 'playground:angular',

		config: (config, { command }) => ({
			optimizeDeps: { rolldownOptions: { plugins: [linker] } },
			// A build is a production one, as Vue's and React's: Angular without
			// development checks and JIT paths, as its CLI builds it. A server
			// bundle (`tools/bench-ssr`) is built in server mode, as the CLI builds
			// one. The dev server and the tests stay in development mode — with its
			// errors and warnings
			...(command === 'build'
				? {
						define: {
							ngDevMode: 'false',
							ngJitMode: 'false',
							ngI18nClosureMode: 'false',
							ngServerMode: String(Boolean(config.build?.ssr)),
						},
					}
				: {}),
		}),

		// Vitest keeps transformed modules on disk between runs (`fsModuleCache`,
		// on by default) and keys a module by its source, the environment and the
		// plugin names. The output of a module this plugin compiles depends on
		// more: on the component's templates and on the whole program — a template
		// compiles into the code of every component that uses it. A key from the
		// output is out of reach: the generator is synchronous and runs before
		// `transform`, while the program is still compiling in its thread. So
		// these modules stay out of the disk cache (`false`), by the same check as
		// `transform`, and the rest keep their usual key (`undefined`)
		configureVitest({ defineCacheKeyGenerator }) {
			defineCacheKeyGenerator(({ id }) => (compiled(fileOf(id)) ? false : undefined))
		},

		// Программа компилируется с запуска, в фоне, а не с первым модулем
		// Angular: иначе её ждёт тот, кто первым открыл Angular, — в браузерном
		// прогоне это первый тест хоста, и под нагрузкой ожидание выходило за
		// таймаут теста. Поток сервера компиляция не держит
		buildStart() {
			void compilation()
		},

		async transform(_code, id) {
			const file = fileOf(id)

			if (!compiled(file)) return null

			const { outputs, resources, errors } = await compilation()

			if (errors) this.error(errors)

			const output = outputs.get(file)

			if (!output) this.error(`[playground] ${file} нет в программе Angular ${tsconfig}`)

			for (const resource of resources.get(file) ?? []) this.addWatchFile(resource)

			return { code: output.code, map: output.map }
		},

		hotUpdate({ file }) {
			if (!last) return

			const changed = normalizePath(file)
			const resource = [...last.resources.values()].some((list) => list.includes(changed))
			const own = compiled(changed) || resource || changed === project

			if (!own && !last.files.has(changed)) return

			// Следующий модуль Angular соберёт программу заново
			pending = null

			if (!own) return

			const graph = this.environment.moduleGraph

			for (const source of last.outputs.keys()) {
				for (const stale of graph.getModulesByFile(source) ?? [])
					graph.invalidateModule(stale)
			}

			this.environment.hot.send({ type: 'full-reload' })

			return []
		},
	}

	return [compiler, linker]
}
