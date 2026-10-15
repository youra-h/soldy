import path from 'node:path'
import ts from 'typescript'
import { transformAsync } from '@babel/core'
import {
	NgtscProgram,
	createCompilerHost,
	formatDiagnostics,
	readConfiguration,
	type CompilerOptions,
} from '@angular/compiler-cli'
import { needsLinking } from '@angular/compiler-cli/linker'
import { normalizePath, type Plugin } from 'vite'

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

/** Выход Angular по одному исходнику: код и его карта. */
type TOutput = {
	readonly code: string
	readonly map: string | null
}

/** Итог компиляции программы. */
type TCompilation = {
	/** Выход по исходнику — только тех, что компилирует Angular (`include`). */
	readonly outputs: ReadonlyMap<string, TOutput>
	/** Файлы программы: правка любого делает компиляцию устаревшей. */
	readonly files: ReadonlySet<string>
	/** Шаблоны компонента по его исходнику: Vite следит за ними вместе с модулем. */
	readonly resources: ReadonlyMap<string, readonly string[]>
	/** Ошибки: с ними выхода нет. */
	readonly errors: readonly ts.Diagnostic[]
}

/** Ссылка на карту в конце выхода TypeScript: карту плагин отдаёт Vite сам. */
const SOURCE_MAP_COMMENT = /\n\/\/# sourceMappingURL=[^\n]*\s*$/

/** JS зависимостей — кандидат в линкер: частичная форма бывает только у пакетов. */
const DEPENDENCY = /[\\/]node_modules[\\/].+\.m?js(?:\?|$)/

/** Путь модуля без запроса — ключ выхода. */
function fileOf(id: string): string {
	return normalizePath(id.split('?', 1)[0])
}

function errorsOf(diagnostics: readonly ts.Diagnostic[]): readonly ts.Diagnostic[] {
	return diagnostics.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)
}

function failed(errors: readonly ts.Diagnostic[]): TCompilation {
	return { outputs: new Map(), files: new Set(), resources: new Map(), errors }
}

/**
 * Программа Angular целиком: разбор, анализ шаблонов и эмит в память — только
 * файлов `compiled`. Каждый раз заново: компиляция идёт однажды на запуск и
 * заново — на правку файла Angular в dev-сервере.
 *
 * Типы и шаблоны здесь не проверяются — это дело `ngc` в CI («Типы —
 * Playground»). Выход не даёт только то, без чего нечего эмитить: ошибки
 * конфига, синтаксиса и структуры Angular.
 */
async function compile(
	tsconfig: string,
	compiled: (file: string) => boolean,
): Promise<TCompilation> {
	const config = readConfiguration(tsconfig)

	if (config.errors.length > 0) return failed(config.errors)

	// В tsconfig хоста эмита нет: по нему `ngc` только проверяет. Выход нужен в
	// памяти — с картой и без деклараций
	const options: CompilerOptions = {
		...config.options,
		noEmit: false,
		declaration: false,
		declarationMap: false,
		sourceMap: true,
		inlineSourceMap: false,
		inlineSources: true,
	}
	const program = new NgtscProgram(config.rootNames, options, createCompilerHost({ options }))

	await program.loadNgStructureAsync()

	const errors = errorsOf([
		...program.getTsOptionDiagnostics(),
		...program.getNgOptionDiagnostics(),
		...program.getTsSyntacticDiagnostics(),
		...program.getNgStructuralDiagnostics(),
	])

	if (errors.length > 0) return failed(errors)

	const code = new Map<string, string>()
	const maps = new Map<string, string>()

	const write: ts.WriteFileCallback = (fileName, text, _bom, _onError, sources) => {
		const [source] = sources ?? []

		if (!source) return

		const file = normalizePath(source.fileName)

		if (fileName.endsWith('.map')) maps.set(file, text)
		else code.set(file, text.replace(SOURCE_MAP_COMMENT, ''))
	}

	const emitted = program.emit({
		emitCallback: ({ program: tsProgram, targetSourceFile, customTransformers }) =>
			targetSourceFile && compiled(normalizePath(targetSourceFile.fileName))
				? tsProgram.emit(targetSourceFile, write, undefined, false, customTransformers)
				: { emitSkipped: true, diagnostics: [] },
	})
	const emitErrors = errorsOf(emitted.diagnostics)

	if (emitErrors.length > 0) return failed(emitErrors)

	const sources = program.getTsProgram().getSourceFiles()

	return {
		outputs: new Map(
			[...code].map(([file, text]) => [file, { code: text, map: maps.get(file) ?? null }]),
		),
		files: new Set(sources.map((source) => normalizePath(source.fileName))),
		resources: new Map(
			sources
				.filter((source) => code.has(normalizePath(source.fileName)))
				.map((source) => [
					normalizePath(source.fileName),
					program.compiler
						.getResourceDependencies(source)
						.map((resource) => normalizePath(resource)),
				]),
		),
		errors: [],
	}
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
		(pending ??= compile(tsconfig, compiled).then((result) => (last = result)))

	const linker: Plugin = {
		name: 'playground:angular-linker',
		transform: { filter: { id: DEPENDENCY }, handler: link },
	}

	const compiler: Plugin = {
		name: 'playground:angular',

		config: (_config, { command }) => ({
			optimizeDeps: { rolldownOptions: { plugins: [linker] } },
			// Сборка стенда — продуктовая, как у Vue и React: Angular в ней без
			// проверок разработки и без путей JIT, как его собирает CLI. Dev-сервер
			// и тесты остаются в режиме разработки — с его ошибками и
			// предупреждениями
			...(command === 'build'
				? {
						define: {
							ngDevMode: 'false',
							ngJitMode: 'false',
							ngI18nClosureMode: 'false',
							ngServerMode: 'false',
						},
					}
				: {}),
		}),

		async transform(_code, id) {
			const file = fileOf(id)

			if (!compiled(file)) return null

			const { outputs, resources, errors } = await compilation()

			if (errors.length > 0) this.error(formatDiagnostics(errors))

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
