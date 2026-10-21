import { parentPort, workerData } from 'node:worker_threads'
import ts from 'typescript'
import {
	NgtscProgram,
	createCompilerHost,
	formatDiagnostics,
	readConfiguration,
	type CompilerOptions,
} from '@angular/compiler-cli'
import { normalizePath } from 'vite'

/**
 * Компиляция программы Angular стенда — в своём потоке (`worker_threads`).
 *
 * Компилятор Angular синхронный: программа целиком — разбор, анализ шаблонов и
 * эмит — занимает поток на секунды, под нагрузкой машины на десятки секунд. В
 * потоке сервера Vite он останавливал всё, что этот поток обслуживает: ответы
 * модулей, а в браузерном прогоне ещё и RPC Vitest — `userEvent` и команды
 * тестов, которые в этот момент шли в других файлах. Действие не возвращалось,
 * и тест падал по таймауту, хотя в нём ничего не сломано. Поток плагина
 * (`src/vite-angular.ts`) теперь только ждёт ответа.
 *
 * Модуль — точка входа потока: Node запускает его исходником, без сборки.
 * Типы в нём только стираемые, а Node, на котором работает компилятор Angular
 * (`engines` у `@angular/compiler-cli`), стирает их сам.
 */

/** Что компилировать: передаёт поток плагина (`workerData`). */
export type TCompileInput = {
	/** Программа Angular — `tsconfig.json` хоста. */
	readonly tsconfig: string
	/** Что из программы эмитится — хост и исходники адаптера. */
	readonly include: readonly RegExp[]
}

/** Выход Angular по одному исходнику: код и его карта. */
export type TOutput = {
	readonly code: string
	readonly map: string | null
}

/**
 * Итог компиляции программы. Пересекает границу потоков, поэтому весь из
 * клонируемых значений: ошибки — уже отформатированным текстом.
 */
export type TCompilation = {
	/** Выход по исходнику — только тех, что компилирует Angular (`include`). */
	readonly outputs: ReadonlyMap<string, TOutput>
	/** Файлы программы: правка любого делает компиляцию устаревшей. */
	readonly files: ReadonlySet<string>
	/** Шаблоны компонента по его исходнику: Vite следит за ними вместе с модулем. */
	readonly resources: ReadonlyMap<string, readonly string[]>
	/** Ошибки текстом: с ними выхода нет. */
	readonly errors: string | null
}

/** Ссылка на карту в конце выхода TypeScript: карту плагин отдаёт Vite сам. */
const SOURCE_MAP_COMMENT = /\n\/\/# sourceMappingURL=[^\n]*\s*$/

function errorsOf(diagnostics: readonly ts.Diagnostic[]): readonly ts.Diagnostic[] {
	return diagnostics.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)
}

function failed(errors: readonly ts.Diagnostic[]): TCompilation {
	return {
		outputs: new Map(),
		files: new Set(),
		resources: new Map(),
		errors: formatDiagnostics(errors),
	}
}

/**
 * Программа Angular целиком: разбор, анализ шаблонов и эмит в память — только
 * файлов `include`. Каждый раз заново: компиляция идёт однажды на запуск и
 * заново — на правку файла Angular в dev-сервере.
 *
 * Типы и шаблоны здесь не проверяются — это дело `ngc` в CI («Типы —
 * Playground»). Выход не даёт только то, без чего нечего эмитить: ошибки
 * конфига, синтаксиса и структуры Angular.
 */
async function compile({ tsconfig, include }: TCompileInput): Promise<TCompilation> {
	const compiled = (file: string) => include.some((pattern) => pattern.test(file))
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
		errors: null,
	}
}

const input: TCompileInput = workerData

parentPort?.postMessage(await compile(input))
