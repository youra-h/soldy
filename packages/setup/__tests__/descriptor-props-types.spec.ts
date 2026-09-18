/**
 * Сторож: состав пропсов в рантайме и в типах совпадает.
 *
 * Состав пропсов компонента записан дважды. Рантайм собирает дескриптор:
 * `getProps()` — contribution самого компонента, его предков и плагинов. Типы
 * всех адаптеров выводятся из `DescriptorAllProps`: интерфейс пропсов ядра
 * (`TProps` дескриптора) и пропсы плагинов из третьего аргумента
 * `definePlugin`. Друг с другом списки никто не сверял, и они разошлись:
 * `dismiss_enabled` у Select жил без типа, и шаблон не проверял его значение, а
 * `variant` у Skeleton был только в типе — компилятор его пропускал, и в
 * разметке он молча становился атрибутом.
 *
 * Сверка в обе стороны, по каждому дескриптору из экспорта:
 * - рантайм — незащищённые пропсы `getProps()` под именем из
 *   `underscorePropNaming`. Защищённые — выходы (`classes`, `layout_styles`),
 *   в тип пропсов они не входят;
 * - тип — ключи `DescriptorAllProps<typeof XDescriptor>`. Их читает type
 *   checker TypeScript по программе с опциями `packages/setup/tsconfig.json`,
 *   корень которой — входной файл в памяти: по псевдониму типа на дескриптор.
 *   Индексная сигнатура тоже ключ: `Record<string, unknown>` принимает любой
 *   проп, и сверять с ним нечего.
 *
 * Поля, которые адаптер дописывает к типу сверх `DescriptorAllProps`, сторож
 * не видит: так в типах всех адаптеров жил `plugins`, которого нет в рантайме.
 */

import { describe, it, expect } from 'vitest'
import { dirname, resolve } from 'node:path'
import * as ts from 'typescript'
import { underscorePropNaming } from '../naming'
import type { IComponentDescriptor } from '../define'
import { exportedDescriptors, required } from './helpers'

const TSCONFIG = resolve(__dirname, '../tsconfig.json')

/** Входной файл программы. На диске его нет, `../descriptors` разрешается от `__tests__`. */
const ENTRY = resolve(__dirname, 'descriptor-props-types.entry.ts')

/**
 * Коллекционный слой: фасады `<Владелец>Collection<Часть>Descriptor` и их база
 * `CollectionDescriptor`.
 *
 * Тип пропсов фасад не объявляет (`defineComponent({...})`): его пропсы входят
 * в интерфейс владельца — `ISelectProps` это свои пропсы Select и
 * коллекционные, — а адаптер собирает компонент из обоих рантайм-списков
 * (`base.component.ts` во Vue). Поэтому пропсы части сверяются в строке
 * владельца, а пропсы базы — в строке каждого владельца, чья часть наследует
 * её через `extends`.
 */
const COLLECTION_LAYER = /^(\w*)Collection(\w*)Descriptor$/

/**
 * `ctrl` и `embedded` объявляет `EntityDescriptor`: так адаптер принимает
 * готовый инстанс и имя места пропом. Их типы дописывает сам адаптер поверх
 * `DescriptorAllProps` (`TBaseComponentProps` во Vue): в интерфейсах пропсов
 * ядра инстанса нет.
 */
const ADAPTER_PROPS = new Set(['ctrl', 'embedded'])

function publicProps(descriptor: IComponentDescriptor): string[] {
	return descriptor
		.getProps()
		.filter((declaration) => !declaration.protected)
		.map((declaration) => underscorePropNaming(declaration.name))
		.filter((name) => !ADAPTER_PROPS.has(name))
}

type TRuntime = {
	/** Имя дескриптора → незащищённые пропсы его и его коллекционной части. */
	rows: Map<string, string[]>
	/** Коллекционные части, чей владелец не экспортирован: их пропсы не сверил бы никто. */
	orphans: string[]
}

function collectRuntime(descriptors: ReadonlyArray<[string, IComponentDescriptor]>): TRuntime {
	const rows = new Map<string, string[]>()
	const orphans: string[] = []

	for (const [name, descriptor] of descriptors) {
		if (!COLLECTION_LAYER.test(name)) rows.set(name, publicProps(descriptor))
	}

	for (const [name, descriptor] of descriptors) {
		const layer = COLLECTION_LAYER.exec(name)

		if (!layer) continue

		const [, owner, part] = layer

		// База слоя: её пропсы приходят в каждую часть через `extends`
		if (!owner && !part) continue

		const row = rows.get(`${owner}${part}Descriptor`)

		if (row) {
			row.push(...publicProps(descriptor))
		} else {
			orphans.push(name)
		}
	}

	return { rows, orphans }
}

function entrySource(names: readonly string[]): string {
	return [
		`import type * as descriptors from '../descriptors'`,
		`import type { DescriptorAllProps } from '../define'`,
		...names.map(
			(name) => `export type ${name} = DescriptorAllProps<typeof descriptors.${name}>`,
		),
	].join('\n')
}

function compilerOptions(): ts.CompilerOptions {
	const { config, error } = ts.readConfigFile(TSCONFIG, ts.sys.readFile)

	if (error) throw new Error(ts.flattenDiagnosticMessageText(error.messageText, '\n'))

	return ts.parseJsonConfigFileContent(config, ts.sys, dirname(TSCONFIG)).options
}

type TTypes = {
	/** Имя дескриптора → ключи `DescriptorAllProps`. */
	keys: Map<string, string[]>
	/** Ошибки входного файла: сломанный импорт дал бы пустые ключи, а не падение. */
	diagnostics: string[]
}

function collectTypes(names: readonly string[]): TTypes {
	const options = compilerOptions()
	const host = ts.createCompilerHost(options)
	const readSourceFile = host.getSourceFile.bind(host)
	const text = entrySource(names)

	host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) =>
		resolve(fileName) === ENTRY
			? ts.createSourceFile(fileName, text, languageVersion)
			: readSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile)

	const program = ts.createProgram({ rootNames: [ENTRY], options, host })
	const entry = required(program.getSourceFile(ENTRY), ENTRY)
	const checker = program.getTypeChecker()
	const keys = new Map<string, string[]>()

	for (const statement of entry.statements) {
		if (!ts.isTypeAliasDeclaration(statement)) continue

		const type = checker.getTypeFromTypeNode(statement.type)

		keys.set(statement.name.text, [
			...checker.getPropertiesOfType(type).map((property) => property.getName()),
			...checker
				.getIndexInfosOfType(type)
				.map((info) => `[key: ${checker.typeToString(info.keyType)}]`),
		])
	}

	const diagnostics = ts
		.getPreEmitDiagnostics(program, entry)
		.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))

	return { keys, diagnostics }
}

const difference = (from: readonly string[], without: readonly string[]): string[] =>
	[...new Set(from)].filter((name) => !without.includes(name)).sort()

describe('сторож: состав пропсов в рантайме и в типах совпадает', () => {
	const { rows, orphans } = collectRuntime(exportedDescriptors())
	const types = collectTypes([...rows.keys()])

	it('дескрипторы найдены в экспорте', () => {
		expect([...rows.keys()]).toEqual(
			expect.arrayContaining(['FrameDescriptor', 'SelectDescriptor', 'SkeletonDescriptor']),
		)
	})

	it('у входного файла программы нет диагностик', () => {
		expect(types.diagnostics).toEqual([])
	})

	it('у каждой коллекционной части есть владелец в экспорте', () => {
		expect(orphans).toEqual([])
	})

	it.each([...rows])('%s', (name, runtime) => {
		const type = required(types.keys.get(name), name)

		expect({
			'только в рантайме': difference(runtime, type),
			'только в типе': difference(type, runtime),
		}).toEqual({ 'только в рантайме': [], 'только в типе': [] })
	})
})
