/**
 * Две реализации одного контракта не должны разойтись.
 *
 * `maxRows`, `contentFit`, `scrollBehavior` объявлены в `custom/list/types.ts`
 * и реализованы дважды — в `TListBox` и в `TSelect`. Копии сознательные:
 * общего предка у списка и поля выбора быть не может (`TValueControl` против
 * `TInputControl`), а попытка отдать свойства плагину сделала ядро
 * несамодостаточным — `new TListBox({ maxRows: 5 })` молча не срабатывал.
 *
 * Цена копий — риск расхождения, и он не выдуманный: в этом же проекте три
 * копии `mode`/`selected` в фасадах дали три разных API, и `<Accordion
 * mode="multiple">` молча не работал. Тест — то же лекарство, что и
 * `setup/__tests__/facade-props.spec.ts`: проверяется контракт, а не
 * реализация.
 */

import { describe, it, expect } from 'vitest'
import { TListBox, TSelect, LIST_DEFAULTS } from '../src'
import type { IList, TDataset, TEvented, TListContentFit, TScrollBehavior, TListIndicator } from '../src'

/**
 * Контракт инстанса для параметризованных проверок ниже: собственно `IList`
 * плюс то немногое, что нужно тесту снаружи него. `events` типизирован
 * `TEvented<any>` — та же оговорка про инвариантность карты событий, что и у
 * опции `engine` фасадов (AGENTS.md, «События item-адаптера»): два разных
 * компонента несут разные точные карты, констрейнту здесь важно только
 * «есть эмиттер».
 */
interface IListInstance extends IList {
	readonly events: TEvented<any>
	readonly dataset: TDataset
	getProps(): Readonly<Partial<IList>>
}

/** Компоненты, которые обязаны нести списочный контракт целиком. */
const IMPLEMENTATIONS: Array<[string, () => IListInstance]> = [
	['TListBox', () => new TListBox()],
	['TSelect', () => new TSelect()],
]

/** Свойство → значение, отличное от умолчания, чтобы сеттер было чем проверить. */
const PROPERTIES = [
	['maxRows', 'change:maxRows', 5],
	['contentFit', 'change:contentFit', 'wrap'],
	['scrollBehavior', 'change:scrollBehavior', 'instant'],
	['indicator', 'change:indicator', 'start'],
] as const

type TListProp = (typeof PROPERTIES)[number][0]

/**
 * Пишет значение в конкретное поле `IList` по его имени.
 *
 * `instance[prop] = value`, где `prop` — union из четырёх ключей, не
 * компилируется: TypeScript выводит для записи через union ключей тип цели
 * `never`, а не объединение типов полей (чтение через union так не ведёт
 * себя, только запись). Поэтому запись разведена по конкретным полям —
 * приведение к точному типу поля, а не к `any`.
 */
function writeListProp(instance: IListInstance, prop: TListProp, value: unknown): void {
	switch (prop) {
		case 'maxRows':
			instance.maxRows = value as number
			return
		case 'contentFit':
			instance.contentFit = value as TListContentFit
			return
		case 'scrollBehavior':
			instance.scrollBehavior = value as TScrollBehavior
			return
		case 'indicator':
			instance.indicator = value as TListIndicator
			return
	}
}

describe.each(IMPLEMENTATIONS)('%s несёт контракт IList', (_name, create) => {
	it.each(PROPERTIES)('%s читается и по умолчанию берётся из LIST_DEFAULTS', (prop) => {
		expect(create()[prop]).toBe(LIST_DEFAULTS[prop])
	})

	it.each(PROPERTIES)('%s пишется', (prop, _event, value) => {
		const instance = create()

		writeListProp(instance, prop, value)

		expect(instance[prop]).toBe(value)
	})

	it.each(PROPERTIES)('%s сообщает о смене событием %s', (prop, event, value) => {
		const instance = create()
		const seen: unknown[] = []

		instance.events.on(event, (v: unknown) => seen.push(v))
		writeListProp(instance, prop, value)

		expect(seen).toEqual([value])
	})

	it.each(PROPERTIES)('%s не эмитит на повторной записи того же значения', (prop, event, value) => {
		const instance = create()

		writeListProp(instance, prop, value)

		const seen: unknown[] = []

		instance.events.on(event, (v: unknown) => seen.push(v))
		writeListProp(instance, prop, value)

		expect(seen).toEqual([])
	})

	/**
	 * Свойства принимаются конструктором — то, ради чего они и вернулись в
	 * ядро из плагина. Голый инстанс должен быть полноценным: `@soldy/core`
	 * заявлен как headless-модель, и адаптера у него может не быть вовсе.
	 */
	it.each(PROPERTIES)('%s принимается конструктором', (prop, _event, value) => {
		const Ctor = create().constructor as new (props: Record<string, unknown>) => any

		expect(new Ctor({ [prop]: value })[prop]).toBe(value)
	})

	it.each(PROPERTIES)('%s попадает в getProps()', (prop, _event, value) => {
		const instance = create()

		writeListProp(instance, prop, value)

		expect(instance.getProps()[prop]).toBe(value)
	})
})

/**
 * `contentFit` уезжает в тему через `data-*`, а не через класс: то же имя
 * получает каждый элемент, и тема читает одно свойство на двух уровнях —
 * `expand` со списка, `wrap` с элемента.
 */
describe.each(IMPLEMENTATIONS)('%s отдаёт contentFit в data-*', (_name, create) => {
	it('атрибут стоит сразу, а не после первой смены', () => {
		expect(create().dataset.get('content-fit')).toBe(LIST_DEFAULTS.contentFit)
	})

	it('атрибут следует за свойством', () => {
		const instance = create()

		instance.contentFit = 'expand'

		expect(instance.dataset.get('content-fit')).toBe('expand')
	})
})

/**
 * `indicator` уезжает в тему тем же путём: на владельце он нужен, чтобы место
 * под отметку резервировалось до первого выбора, а элементам тот же атрибут
 * ставит расширение коллекции.
 */
describe.each(IMPLEMENTATIONS)('%s отдаёт indicator в data-*', (_name, create) => {
	it('атрибут стоит сразу, а не после первой смены', () => {
		expect(create().dataset.get('indicator')).toBe(LIST_DEFAULTS.indicator)
	})

	it('атрибут следует за свойством', () => {
		const instance = create()

		instance.indicator = 'end'

		expect(instance.dataset.get('indicator')).toBe('end')
	})
})

/**
 * Select дополнительно вычисляет `autoFitWidth`: панель телепортирована, и
 * ширину ей задаёт плагин якоря, а не CSS. Списку такого не нужно — там ширину
 * меняет сам `data-content-fit`.
 */
describe('TSelect.autoFitWidth', () => {
	it('панель подгоняется под поле, пока contentFit не expand', () => {
		expect(new TSelect().autoFitWidth).toBe(true)
		expect(new TSelect({ contentFit: 'wrap' }).autoFitWidth).toBe(true)
	})

	it('expand снимает подгонку — панель идёт по содержимому', () => {
		expect(new TSelect({ contentFit: 'expand' }).autoFitWidth).toBe(false)
	})
})
