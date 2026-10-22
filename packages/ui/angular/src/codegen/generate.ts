/**
 * generate — кодогенератор метаданных Angular-компонентов.
 *
 * Читает manifest.ts из каждой папки компонентов, прогоняет дескриптор через
 * useInputs / useOutputs и генерирует `generated/<name>.metadata.ts`: массивы
 * имён входов и выходов и абстрактную директиву `T<Имя>Surface` — поверхность
 * компонента в Angular. Она объявляет входы и выходы своим декоратором и даёт
 * им тип — входам полями, выходам геттерами, — а компонент наследует её, и
 * своих `inputs` и `outputs` у него нет.
 *
 * Члены класса нужны строгой проверке шаблона: выход она читает как свойство
 * класса, а значение привязки входа сверяет с полем входа. Поле входа —
 * `declare` с типом `TInputValue` (по фабрике дескриптора из манифеста и имени
 * входа): в рантайме его нет, значение пишет Angular, и поле его не затирает.
 * Поле входа — без `readonly`: с ним привязка при `strictInputAccessModifiers`
 * была бы ошибкой.
 *
 * Выход — геттер с типом `TOutputEmitter` (по той же фабрике и полному имени
 * события), он стоит на прототипе один раз на класс. Эмиттер заводит первое
 * чтение — привязка `(soActionPress)` в шаблоне потребителя или подписка из
 * кода: геттер зовёт `TComponentBase.createOutput`, и тот кладёт эмиттер
 * собственным свойством экземпляра, поэтому следующие чтения геттер уже не
 * проходят. Выход, который никто не читал, эмиттера не заводит вовсе.
 * Сгенерированный код эмиттеров не создаёт.
 *
 * Входы объявляет тот же класс, что их поля: поле входа проверка шаблона ищет
 * только среди собственных членов класса, чей декоратор объявил вход, а вход
 * без такого поля пропускает молча. Объяви компонент свои `inputs` в
 * `@Component` — они остались бы без сверки, хотя поле в базе есть.
 * Декоратор `@Directive` нужен ещё и метаданным базы: на классе без него
 * компилятор их обрывает, и вход `ctrl` пропал бы из шаблона потребителя
 * (`[ctrl]="btn"` — NG8002).
 *
 * Булев вход (проп ровно `Boolean`, `useBooleanInputs`) декоратор объявляет
 * объектом с `transform: booleanInput`, остальные — строкой, поэтому `inputs`
 * декоратора — литерал, а не спред `<Имя>Inputs`. Тот остаётся списком имён:
 * по нему `TComponentBase` читает входы. Transform Angular применяет к любой
 * записи входа до `ngOnChanges` и до записи в поле, поэтому поле входа
 * (`TInputValue`) — тип после transform, а тип записи проверка шаблона берёт
 * у параметра transform: `disabled` без значения проходит, `disabled="yes"` —
 * ошибка. `booleanInput` импортируют только файлы с булевым входом.
 *
 * У коллекционного компонента контекстов два — свой и фасада коллекции, — а
 * поверхность одна: входы и выходы обоих дескрипторов, сначала компонента.
 * Одноимённые попадают один раз, от дескриптора компонента (триггер
 * `change:closable` есть и у таба, и у его фасада). Тип выхода — по его
 * дескриптору: карту событий фасада несёт дескриптор фасада. Тип входа — по
 * дескриптору компонента, и у входов фасада тоже: класс фасада объявляет
 * пропсами `IComponentProps`, а типы `items`, `mode`, `selected` несёт
 * интерфейс пропсов ядра компонента (`IListBoxProps`). Вход фасада, которого
 * в нём нет, не компилируется. Фасад поверхность называет и базе
 * (`TComponentBase<TInstance, TFacade>`): его свойства шаблон читает из того же
 * `state()`, а сам фасад — из `facade()`.
 *
 * Выходы плагинов дескриптора компонента (`DescriptorPluginOutputs` —
 * `names_selectAll` у Table) поверхность называет базе третьим параметром:
 * шаблон читает их из того же `state()`, и без них в типе строгий шаблон
 * отверг бы чтение по имени (TS7053). У компонента без фасада второй параметр
 * — `unknown`.
 *
 * У части, которая сразу и элемент коллекции над ней, и владелец своей (пункт
 * с подменю), контекстов три: свой, фасад элемента (`facade`) и фасад
 * владельца (`ownerFacade`). Входы и выходы фасада владельца идут после
 * фасада, по тому же правилу: одноимённые — один раз, от первого дескриптора
 * (`choose` есть у фасада меню и в карте событий самого подменю). Тип выхода —
 * по его дескриптору, тип входа — по дескриптору компонента: пропсы своей
 * коллекции входят в интерфейс пропсов ядра части (`IMenuSubmenuProps`).
 * Фасад владельца поверхность называет базе четвёртым параметром: его
 * свойства (`sections`, `submenus`) шаблон читает из того же `state()`. У
 * остальных четвёртого параметра нет — его умолчание у базы `unknown`, и
 * поверхности компонентов без фасада владельца генератор не меняет.
 *
 * Запуск: node --import tsx/esm src/codegen/generate.ts
 *   (или через скрипт в package.json: "generate": "tsx src/codegen/generate.ts")
 *
 * Сгенерированные файлы — артефакты сборки. НЕ редактировать вручную.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import * as prettier from 'prettier'
import type { IComponentDescriptor } from '@soldy-ui/setup'
import { collectManifests } from './collect-manifests'
import { useBooleanInputs, useInputs } from '../adapter/common/useInputs'
import { useOutputs } from '../adapter/common/useOutputs'

function toPascalCase(str: string): string {
	return str.replace(/(^\w|-\w)/g, (g) => g.replace('-', '').toUpperCase())
}

/** Чей дескриптор несёт выход — под этим именем его тип импортирует сгенерированный файл. */
type TSource = 'descriptor' | 'facade' | 'ownerFacade'

/** Выход, полное имя события ядра за ним и дескриптор, чья это карта событий. */
type TOutput = readonly [output: string, event: string, source: TSource]

/** Дескриптор поверхности и имя, под которым его импортирует сгенерированный файл. */
type TSurfaceSource = readonly [source: TSource, descriptor: IComponentDescriptor]

/** Имена по порядку, без повторов: первое вхождение главнее. */
function unique<T>(values: readonly T[], key: (value: T) => string): T[] {
	const seen = new Set<string>()

	return values.filter((value) => {
		const name = key(value)

		if (seen.has(name)) return false

		seen.add(name)

		return true
	})
}

/**
 * Приводит вывод к тому же виду, что даёт `npm run format`.
 *
 * Иначе генератор и prettier — два писателя одних файлов с разным мнением о
 * кавычках и переносах: формат-прогон по репозиторию переписывает generated,
 * а CI сравнивает вывод generate с закоммиченным и падает на дрейфе, которого
 * по сути нет.
 */
async function format(content: string, filePath: string): Promise<string> {
	const config = await prettier.resolveConfig(filePath, { editorconfig: true })

	return prettier.format(content, { ...config, filepath: filePath })
}

async function generate(): Promise<void> {
	const manifests = await collectManifests()

	if (manifests.length === 0) {
		console.warn('⚠️  No manifests found in components/')
		return
	}

	const generatedDir = path.resolve(import.meta.dirname, '../generated')

	if (!fs.existsSync(generatedDir)) {
		fs.mkdirSync(generatedDir, { recursive: true })
	}

	for (const manifest of manifests) {
		const { name, folder } = manifest
		const facade = manifest.facade?.()
		const ownerFacade = manifest.ownerFacade?.()
		// Дескрипторы поверхности по порядку: свой, фасад, фасад владельца
		const sources: readonly TSurfaceSource[] = [
			['descriptor', manifest.descriptor()],
			...(facade ? [['facade', facade] as const] : []),
			...(ownerFacade ? [['ownerFacade', ownerFacade] as const] : []),
		]
		// Входы фасадов — после своих; одноимённый вход — от первого дескриптора
		const inputs = unique(
			sources.flatMap(([, descriptor]) => useInputs(descriptor)),
			(input) => input,
		)
		// Булев вход — тот, что булев у дескриптора, от которого взят вход
		const booleans = new Set(
			sources.flatMap(([, descriptor], index) => {
				const earlier = new Set(
					sources.slice(0, index).flatMap(([, prior]) => useInputs(prior)),
				)

				return useBooleanInputs(descriptor).filter((input) => !earlier.has(input))
			}),
		)
		const outputs = unique<TOutput>(
			sources.flatMap(([source, descriptor]) =>
				useOutputs(descriptor).map(([output, event]): TOutput => [output, event, source]),
			),
			([output]) => output,
		)
		const constName = toPascalCase(name)
		// Параметры базы: фасад — `unknown` у компонента без него, фасад владельца
		// — только у части с ним, у остальных его заменяет умолчание базы
		const baseParams = [
			'TInstance',
			facade ? 'DescriptorInstance<typeof facade>' : 'unknown',
			'DescriptorPluginOutputs<typeof descriptor>',
			...(ownerFacade ? ['DescriptorInstance<typeof ownerFacade>'] : []),
		]

		// Вход в декораторе: булев — объектом с transform, остальные — именем
		const declaredInputs = inputs.map((input) =>
			booleans.has(input)
				? `{ name: ${JSON.stringify(input)}, transform: booleanInput }`
				: JSON.stringify(input),
		)

		const content = [
			'// Auto-generated by @soldy-ui/angular codegen. DO NOT EDIT.',
			`import { Directive } from '@angular/core'`,
			`import type { IEntity } from '@soldy-ui/core'`,
			`import type { ${facade ? 'DescriptorInstance, ' : ''}DescriptorPluginOutputs } from '@soldy-ui/setup'`,
			`import { TComponentBase, type TInputValue, type TOutputEmitter } from '../adapter/runtime'`,
			...(booleans.size > 0
				? [`import { booleanInput } from '../adapter/runtime/boolean-input'`]
				: []),
			`import type { ${sources.map(([source]) => source).join(', ')} } from '../components/${folder}/manifest'`,
			'',
			`export const ${constName}Inputs = ${JSON.stringify(inputs)} as const`,
			`export const ${constName}Outputs = ${JSON.stringify(outputs.map(([output]) => output))} as const`,
			'',
			'/**',
			` * Поверхность ${constName} в Angular: входы и выходы компонента с типами для`,
			' * строгой проверки шаблона. Значения входов пишет Angular — поля их только',
			' * объявляют. Выход — геттер: эмиттер заводит первое чтение выхода',
			' * (`createOutput`), а выход, который никто не читал, его не заводит.',
			...(booleans.size > 0
				? [' * Булевы входы проходят `booleanInput`: атрибут без значения включает проп.']
				: []),
			...(facade && !ownerFacade
				? [
						' * Контекстов у компонента два: входы и выходы фасада коллекции — здесь же,',
						' * после своих. Тип входа фасада — по дескриптору компонента, выхода — по',
						' * дескриптору фасада.',
					]
				: []),
			...(ownerFacade
				? [
						' * Контекстов у компонента три: входы и выходы фасада элемента и фасада',
						' * владельца — здесь же, после своих. Тип входа фасадов — по дескриптору',
						' * компонента, выхода — по дескриптору фасада. Свойства фасада владельца',
						' * шаблон читает из `state()`: их тип база получает четвёртым параметром.',
					]
				: []),
			' * Выходы плагинов дескриптора шаблон читает из `state()`: их тип база',
			' * получает третьим параметром.',
			' */',
			`@Directive({ standalone: true, inputs: [${declaredInputs.join(', ')}], outputs: [...${constName}Outputs] })`,
			`export abstract class T${constName}Surface<TInstance extends IEntity> extends TComponentBase<${baseParams.join(', ')}> {`,
			...inputs.map(
				(input) =>
					`declare ${input}: TInputValue<typeof descriptor, ${JSON.stringify(input)}>`,
			),
			...outputs.map(([output, event, source]) =>
				[
					`get ${output}(): TOutputEmitter<typeof ${source}, ${JSON.stringify(event)}> {`,
					`return this.createOutput(${JSON.stringify(output)})`,
					'}',
				].join('\n'),
			),
			'}',
			'',
		].join('\n')

		const filePath = path.join(generatedDir, `${name}.metadata.ts`)

		fs.writeFileSync(filePath, await format(content, filePath))
		console.log(`✅  Generated ${filePath}`)
	}

	console.log(`\n${manifests.length} files generated.`)
}

generate().catch((err) => {
	console.error(err)
	process.exit(1)
})
