/**
 * Сторож: состав пропсов и выходов плагинов в рантайме и в типах совпадает.
 *
 * Состав пропсов компонента записан дважды. Рантайм собирает дескриптор:
 * `getProps()` — contribution самого компонента, его предков и плагинов. Типы
 * всех адаптеров выводятся из `DescriptorAllProps`: интерфейс пропсов ядра
 * (тип пропсов `ctor` дескриптора) и контракты плагинов. Друг с другом списки
 * никто не сверял, и они разошлись: `dismiss_enabled` у Select жил без типа, и
 * шаблон не проверял его значение, а `variant` у Skeleton был только в типе —
 * компилятор его пропускал, и в разметке он молча становился атрибутом.
 *
 * У плагина запись одна: входы и выходы (защищённые пропсы, которые плагин
 * вычисляет, а разметка только читает) `definePlugin` выводит из того же
 * contribution, что читает рантайм. Сверка их всё равно держит: она ловит
 * поломку самого вывода — потерянный неймспейс, выход, попавший во входы.
 * До вывода выход без типа читал шаблон Frame (`layout_styles`), а
 * `dismiss_ownerAttribute` у Select описывал рукописный тип, который с
 * плагином не сверялся никем.
 *
 * Две сверки в обе стороны, по каждому дескриптору из экспорта:
 * - пропсы: рантайм — незащищённые пропсы `getProps()` под именем из
 *   `underscorePropNaming`, тип — ключи `DescriptorAllProps<typeof XDescriptor>`.
 *   Защищённые в тип пропсов не входят: свои выходы компонента (`classes`,
 *   `aria`) типизирует инстанс, выходы плагинов сверяются отдельно;
 * - выходы плагинов: рантайм — защищённые пропсы из `props` определений
 *   `descriptor.plugins` под именем из `underscorePropNaming`, тип — ключи
 *   `DescriptorPluginOutputs<typeof XDescriptor>`.
 *
 * Ключи типов читает type checker TypeScript по программе с опциями
 * `packages/setup/tsconfig.json`, корень которой — входной файл в памяти: по
 * псевдониму типа на дескриптор в каждой сверке. Индексная сигнатура тоже
 * ключ: `Record<string, unknown>` принимает любой проп, и сверять с ним нечего.
 *
 * Поля, которые адаптер дописывает к типу сверх `DescriptorAllProps`, сторож
 * не видит: так в типах всех адаптеров жил `plugins`, которого нет в рантайме.
 */

import { describe, it, expect } from 'vitest'
import { dirname, resolve } from 'node:path'
import * as ts from 'typescript'
import { underscorePropNaming } from '../protected/naming'
import type { IComponentDescriptor } from '../protected/define'
import { exportedDescriptors, required } from './helpers'

const TSCONFIG = resolve(__dirname, '../tsconfig.json')

/** Входной файл программы. На диске его нет, `../descriptors` разрешается от `__tests__`. */
const ENTRY = resolve(__dirname, 'descriptor-props-types.entry.ts')

/** Сверка во входном файле: префикс псевдонима и экстрактор из `../define`. */
type TCheck = { readonly prefix: string; readonly extractor: string }

const PROPS: TCheck = { prefix: 'props_', extractor: 'DescriptorAllProps' }
const OUTPUTS: TCheck = { prefix: 'outputs_', extractor: 'DescriptorPluginOutputs' }

const aliasOf = (check: TCheck, name: string): string => `${check.prefix}${name}`

/**
 * Коллекционный слой: фасады `<Владелец>Collection<Часть>Descriptor` и их база
 * `CollectionDescriptor`.
 *
 * В собственном типе фасада его пропсов нет: класс фасада объявляет
 * `IComponentProps`, а коллекционные пропсы входят в интерфейс владельца —
 * `ISelectProps` это свои пропсы Select и коллекционные. Адаптер собирает
 * компонент из обоих рантайм-списков (`base.component.ts` во Vue). Поэтому
 * пропсы части сверяются в строке владельца, а пропсы базы — в строке каждого
 * владельца, чья часть наследует её через `extends`.
 *
 * Выходы плагинов у части свои: адаптер создаёт ей отдельный контекст, и тип
 * выходов приходит из её собственного дескриптора. Поэтому во второй сверке
 * строка есть у каждого дескриптора, у части и базы тоже.
 */
const COLLECTION_LAYER = /^(\w*)Collection(\w*)Descriptor$/

/**
 * `ctrl`, `embedded` и `pluginProps` объявляет `EntityDescriptor`: так адаптер принимает
 * готовый инстанс и имя места пропом. Их типы дописывает сам адаптер поверх
 * `DescriptorAllProps` (`TAdapterProps`): в интерфейсах пропсов ядра инстанса
 * нет.
 */
const ADAPTER_PROPS = new Set(['ctrl', 'embedded', 'pluginProps'])

function publicProps(descriptor: IComponentDescriptor): string[] {
	return descriptor
		.getProps()
		.filter((declaration) => !declaration.protected)
		.map((declaration) => underscorePropNaming(declaration.name))
		.filter((name) => !ADAPTER_PROPS.has(name))
}

/** Выходы плагинов дескриптора: защищённые пропсы из contribution его плагинов. */
function pluginOutputs(descriptor: IComponentDescriptor): string[] {
	return descriptor.plugins
		.flatMap((plugin) => plugin.props)
		.filter((declaration) => declaration.protected)
		.map((declaration) => underscorePropNaming(declaration.name))
}

type TRuntime = {
	/** Имя дескриптора → незащищённые пропсы его и его коллекционной части. */
	props: Map<string, string[]>
	/** Имя дескриптора → выходы его плагинов. */
	outputs: Map<string, string[]>
	/** Коллекционные части, чей владелец не экспортирован: их пропсы не сверил бы никто. */
	orphans: string[]
}

function collectRuntime(descriptors: ReadonlyArray<[string, IComponentDescriptor]>): TRuntime {
	const props = new Map<string, string[]>()
	const outputs = new Map<string, string[]>()
	const orphans: string[] = []

	for (const [name, descriptor] of descriptors) {
		outputs.set(name, pluginOutputs(descriptor))

		if (!COLLECTION_LAYER.test(name)) props.set(name, publicProps(descriptor))
	}

	for (const [name, descriptor] of descriptors) {
		const layer = COLLECTION_LAYER.exec(name)

		if (!layer) continue

		const [, owner, part] = layer

		// База слоя: её пропсы приходят в каждую часть через `extends`
		if (!owner && !part) continue

		const row = props.get(`${owner}${part}Descriptor`)

		if (row) {
			row.push(...publicProps(descriptor))
		} else {
			orphans.push(name)
		}
	}

	return { props, outputs, orphans }
}

/** Псевдонимы типов: по одному на дескриптор в каждой сверке. */
function entrySource(checks: ReadonlyArray<[TCheck, Iterable<string>]>): string {
	return [
		`import type * as descriptors from '../content/descriptors'`,
		`import type { ${checks.map(([check]) => check.extractor).join(', ')} } from '../protected/define'`,
		...checks.flatMap(([check, names]) =>
			[...names].map(
				(name) =>
					`export type ${aliasOf(check, name)} = ${check.extractor}<typeof descriptors.${name}>`,
			),
		),
	].join('\n')
}

function compilerOptions(): ts.CompilerOptions {
	const { config, error } = ts.readConfigFile(TSCONFIG, ts.sys.readFile)

	if (error) throw new Error(ts.flattenDiagnosticMessageText(error.messageText, '\n'))

	return ts.parseJsonConfigFileContent(config, ts.sys, dirname(TSCONFIG)).options
}

type TTypes = {
	/** Псевдоним типа → его ключи. */
	keys: Map<string, string[]>
	/** Ошибки входного файла: сломанный импорт дал бы пустые ключи, а не падение. */
	diagnostics: string[]
}

function collectTypes(text: string): TTypes {
	const options = compilerOptions()
	const host = ts.createCompilerHost(options)
	const readSourceFile = host.getSourceFile.bind(host)

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

describe('сторож: состав пропсов и выходов плагинов в рантайме и в типах совпадает', () => {
	const { props, outputs, orphans } = collectRuntime(exportedDescriptors())
	const types = collectTypes(
		entrySource([
			[PROPS, props.keys()],
			[OUTPUTS, outputs.keys()],
		]),
	)

	/** Ключи типа сверки по дескриптору; нет псевдонима — строка не сверена бы вовсе. */
	const typeKeys = (check: TCheck, name: string): string[] =>
		required(types.keys.get(aliasOf(check, name)), aliasOf(check, name))

	const expectSame = (runtime: readonly string[], type: readonly string[]): void => {
		expect({
			'только в рантайме': difference(runtime, type),
			'только в типе': difference(type, runtime),
		}).toEqual({ 'только в рантайме': [], 'только в типе': [] })
	}

	it('дескрипторы найдены в экспорте', () => {
		expect([...props.keys()]).toEqual(
			expect.arrayContaining(['FrameDescriptor', 'SelectDescriptor', 'SkeletonDescriptor']),
		)
	})

	it('у входного файла программы нет диагностик', () => {
		expect(types.diagnostics).toEqual([])
	})

	it('у каждой коллекционной части есть владелец в экспорте', () => {
		expect(orphans).toEqual([])
	})

	describe('пропсы', () => {
		it.each([...props])('%s', (name, runtime) => {
			expectSame(runtime, typeKeys(PROPS, name))
		})
	})

	describe('выходы плагинов', () => {
		it('выходы в рантайме найдены: сверка не проходит вхолостую', () => {
			expect(outputs.get('FrameDescriptor')).toEqual(['layout_styles'])
			expect(outputs.get('SelectDescriptor')).toEqual(
				expect.arrayContaining(['dismiss_ownerAttribute']),
			)
		})

		it.each([...outputs])('%s', (name, runtime) => {
			expectSame(runtime, typeKeys(OUTPUTS, name))
		})
	})
})
