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
import type { IList, TDataset } from '../src'
import type { TListEvents, IListProps } from '../src/components/custom/list/types'

/**
 * Контракт инстанса для параметризованных проверок ниже: собственно `IList`
 * плюс то немногое, что нужно тесту снаружи него. `events` типизирован
 * структурно — только методом `on` по `TListEvents`: два компонента несут
 * разные точные карты событий (в каждой сверх `TListEvents` есть ещё
 * собственные события), тесту нужна лишь подписка на списочные.
 */
interface IListInstance extends IList {
	readonly events: {
		on<K extends keyof TListEvents>(event: K, handler: TListEvents[K]): void
	}
	readonly dataset: TDataset
	getProps(): Readonly<Partial<IList>>
}

/** Конструктор компонента, который обязан нести списочный контракт целиком. */
type TListCtor = new (props?: Partial<IListProps>) => IListInstance

/** Компоненты, которые обязаны нести списочный контракт целиком. */
const IMPLEMENTATIONS: Array<[string, TListCtor]> = [
	['TListBox', TListBox],
	['TSelect', TSelect],
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
 * `instance[prop] = value` через union ключей не компилируется: TypeScript
 * выводит для записи через union тип цели `never` (чтение через union так не
 * ведёт себя, только запись — известное ограничение). Обобщённая по `K`
 * функция — тот особый случай, для которого компилятор запись всё же
 * разрешает: `K` здесь один конкретный (хоть и неизвестный вызывающему)
 * ключ, а не готовый union.
 */
function writeListProp<K extends TListProp>(instance: IList, prop: K, value: IList[K]): void {
	instance[prop] = value
}

/** Тот же приём для построения `props`: `{ [prop]: value }` под конкретным `K`. */
function propsFor<K extends TListProp>(prop: K, value: IList[K]): Partial<IListProps> {
	return { [prop]: value }
}

describe.each(IMPLEMENTATIONS)('%s несёт контракт IList', (_name, Ctor) => {
	const create = () => new Ctor()

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

	it.each(PROPERTIES)(
		'%s не эмитит на повторной записи того же значения',
		(prop, event, value) => {
			const instance = create()

			writeListProp(instance, prop, value)

			const seen: unknown[] = []

			instance.events.on(event, (v: unknown) => seen.push(v))
			writeListProp(instance, prop, value)

			expect(seen).toEqual([])
		},
	)

	/**
	 * Свойства принимаются конструктором — то, ради чего они и вернулись в
	 * ядро из плагина. Голый инстанс должен быть полноценным: `@soldy-ui/core`
	 * заявлен как headless-модель, и адаптера у него может не быть вовсе.
	 */
	it.each(PROPERTIES)('%s принимается конструктором', (prop, _event, value) => {
		expect(new Ctor(propsFor(prop, value))[prop]).toBe(value)
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
describe.each(IMPLEMENTATIONS)('%s отдаёт contentFit в data-*', (_name, Ctor) => {
	const create = () => new Ctor()

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
describe.each(IMPLEMENTATIONS)('%s отдаёт indicator в data-*', (_name, Ctor) => {
	const create = () => new Ctor()

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
