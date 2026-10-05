// @vitest-environment jsdom

/**
 * Сторож: монтирование элемента коллекции не оставляет подписок на движке.
 *
 * Фасад элемента получает при сборке контекст элемента (`TItemContext`), и
 * item-адаптеры этого контекста подписаны на расширения движка — выбор,
 * порядок, список, — а некоторые и на сам элемент. Движок живёт дольше
 * монтирования. Элемент из данных (`items`) остаётся в коллекции, когда
 * фильтр или страница его прячут, и монтируется заново, когда показывают;
 * React под StrictMode и `<Activity>` пересобирает элемент, не размонтируя.
 * Контекст, который монтирование не освободило, оставляет на шинах движка
 * обработчики мёртвого фасада — с каждым показом новые, и каждое изменение
 * выбора их обходит. Снаружи этого не видно, поэтому стережётся тестом.
 *
 * Сверка — шпионами на `on` и `off` шин, как в `plugin-unsubscribe.spec.ts`:
 * после размонтирования каждая пара «событие, обработчик», повешенная на шину
 * за время монтирований, найдена среди снятых. Шпионы ставятся после сборки
 * списка, поэтому его собственные подписки в сверку не попадают. Элемент
 * монтируется так, как его монтируют адаптеры: свой контекст, контекст фасада
 * на его наборе, подписка на состояние обоих, `attach`; размонтирование —
 * отписка и `destroy` в том же порядке. После размонтирования состояние
 * фасада читается ещё раз, как это делает React со сборкой, которую уже
 * уничтожил: чтение не должно заводить подписок заново.
 *
 * Идёт по всем фасадам элементов из экспорта: новая коллекция попадёт под
 * проверку сама — без строки в таблице сторож упадёт.
 */

import { describe, it, expect } from 'vitest'
import { TCollectionItemComponent, TListBoxItem } from '@soldy-ui/core'
import type { TCollectionEngine } from '@soldy-ui/core'
import {
	AccordionCollectionDescriptor,
	AccordionCollectionItemDescriptor,
	AccordionDescriptor,
	AccordionItemDescriptor,
	CalendarCollectionDescriptor,
	CalendarCollectionItemDescriptor,
	CalendarDescriptor,
	CalendarItemDescriptor,
	ListBoxCollectionDescriptor,
	ListBoxCollectionItemDescriptor,
	ListBoxDescriptor,
	ListBoxItemDescriptor,
	RadioGroupCollectionDescriptor,
	RadioGroupCollectionItemDescriptor,
	RadioGroupDescriptor,
	RadioGroupItemDescriptor,
	SelectCollectionDescriptor,
	SelectCollectionItemDescriptor,
	SelectDescriptor,
	SelectItemDescriptor,
	TableCollectionDescriptor,
	TableCollectionRowDescriptor,
	TableDescriptor,
	TableRowDescriptor,
	TabsCollectionContentDescriptor,
	TabsCollectionDescriptor,
	TabsCollectionItemDescriptor,
	TabsContentDescriptor,
	TabsDescriptor,
	TabsItemDescriptor,
	TagsCollectionDescriptor,
	TagsCollectionItemDescriptor,
	TagsDescriptor,
	TagsItemDescriptor,
} from '../content/descriptors'
import {
	TCollectionExtension,
	TCollectionItemExtension,
	TTabsContentBindingExtension,
} from '../content/extensions'
import type { TCollectionItemFacade, TCollectionOwner } from '../content/extensions'
import { createAdapterContext } from '../protected/adapter'
import type { IAdapterContext, TContextContract, TElevatorFactory } from '../protected/adapter'
import type { IComponentDescriptor, IPluginsContract } from '../protected/define'
import { CommonProfile } from '../protected/naming'
import {
	createElevatorFactory,
	exportedDescriptors,
	leftovers,
	required,
	spyBus,
	subscribed,
	type IBusSpy,
} from './helpers'

/** Сколько раз элемент монтируется и снимается: утечка растёт с каждым разом. */
const MOUNTS = 3

/** Состав списка из данных: у элемента из данных `value` есть в любой коллекции. */
const SOURCES = [{ value: 'a' }, { value: 'b' }]

/** Список, собранный над составом, и лифт, через который его находят элементы. */
type TMountedList = {
	readonly engine: TCollectionEngine<any, any>
	readonly elevator: TElevatorFactory
}

/**
 * Собрать список так, как его собирают адаптеры: свой контекст и контекст
 * фасада коллекции на его наборе, с расширением коллекции.
 */
function mountList<TFacade extends TCollectionOwner, TPlugins extends IPluginsContract>(
	own: IComponentDescriptor,
	collection: IComponentDescriptor<TContextContract<TFacade, TPlugins>>,
	items: readonly object[],
): TMountedList {
	const { factory: elevator } = createElevatorFactory()
	const owner = createAdapterContext(own, {})
	const facade = createAdapterContext(
		collection,
		{ props: { items: [...items] }, options: { owner: owner.instance } },
		{ bundle: owner.bundle },
	).use(TCollectionExtension, { elevator })

	return { engine: facade.instance.engine, elevator }
}

/** Смонтированное: контекст фасада и размонтирование. */
type TMounted = {
	readonly facade: IAdapterContext
	readonly unmount: () => void
}

/** Смонтированный элемент — ещё и его экземпляр. */
type TMountedItem = TMounted & { readonly instance: object }

/**
 * Принять контексты, как это делает рантайм адаптера: подписка на состояние и
 * `attach` — по порядку сборки. Размонтирование — отписка и `destroy` в том же
 * порядке, как `onUnmounted` у Vue.
 */
function accept(contexts: readonly IAdapterContext[]): () => void {
	const offs = contexts.map((context) => context.connect(CommonProfile).state.subscribe(() => {}))

	for (const context of contexts) context.attach()

	return () => {
		offs.forEach((off) => off())

		for (const context of contexts) context.destroy()
	}
}

/**
 * Перечитать состояние уже уничтоженной сборки. Так делает React: под
 * StrictMode он заново подписывается на обмен прежней сборки, хотя её
 * контексты уже уничтожены. Фасад, который держит отпущенный контекст
 * элемента, на таком чтении создал бы адаптеры заново.
 */
function reread(context: IAdapterContext): void {
	context.connect(CommonProfile).state.subscribe(() => {})()
}

/** Смонтировать, размонтировать и перечитать размонтированное. */
function cycle(mount: () => TMounted): void {
	const { facade, unmount } = mount()

	unmount()
	reread(facade)
}

/**
 * Откуда элемент: из данных списка — его экземпляр приходит `ctrl`, — или из
 * разметки — экземпляр строит своя сборка по пропсам.
 */
type TItemSource = { readonly ctrl: object } | { readonly props: object }

/**
 * Смонтировать элемент так, как его монтируют адаптеры: свой контекст и
 * контекст фасада на его наборе с расширением элемента.
 */
function mountItem<TFacade extends TCollectionItemFacade, TPlugins extends IPluginsContract>(
	own: IComponentDescriptor,
	collection: IComponentDescriptor<TContextContract<TFacade, TPlugins>>,
	elevator: TElevatorFactory,
	source: TItemSource,
): TMountedItem {
	const props = 'props' in source ? source.props : {}
	const adapter = createAdapterContext(own, { ...source, props })
	const facade = createAdapterContext(collection, { props }, { bundle: adapter.bundle }).use(
		TCollectionItemExtension,
		{ item: adapter.instance, elevator },
	)

	return { instance: adapter.instance, facade, unmount: accept([facade, adapter]) }
}

/** Коллекция под сторожем: её список и её элемент. */
type TCollectionKit = {
	readonly list: (items: readonly object[]) => TMountedList
	readonly item: (elevator: TElevatorFactory, source: TItemSource) => TMountedItem
}

/** Коллекции экспорта — ключ по дескриптору фасада элемента. */
const COLLECTIONS: Readonly<Record<string, TCollectionKit>> = {
	AccordionCollectionItemDescriptor: {
		list: (items) => mountList(AccordionDescriptor(), AccordionCollectionDescriptor(), items),
		item: (elevator, source) =>
			mountItem(
				AccordionItemDescriptor(),
				AccordionCollectionItemDescriptor(),
				elevator,
				source,
			),
	},
	ListBoxCollectionItemDescriptor: {
		list: (items) => mountList(ListBoxDescriptor(), ListBoxCollectionDescriptor(), items),
		item: (elevator, source) =>
			mountItem(ListBoxItemDescriptor(), ListBoxCollectionItemDescriptor(), elevator, source),
	},
	RadioGroupCollectionItemDescriptor: {
		list: (items) => mountList(RadioGroupDescriptor(), RadioGroupCollectionDescriptor(), items),
		item: (elevator, source) =>
			mountItem(
				RadioGroupItemDescriptor(),
				RadioGroupCollectionItemDescriptor(),
				elevator,
				source,
			),
	},
	SelectCollectionItemDescriptor: {
		list: (items) => mountList(SelectDescriptor(), SelectCollectionDescriptor(), items),
		item: (elevator, source) =>
			mountItem(SelectItemDescriptor(), SelectCollectionItemDescriptor(), elevator, source),
	},
	TabsCollectionItemDescriptor: {
		list: (items) => mountList(TabsDescriptor(), TabsCollectionDescriptor(), items),
		item: (elevator, source) =>
			mountItem(TabsItemDescriptor(), TabsCollectionItemDescriptor(), elevator, source),
	},
	TagsCollectionItemDescriptor: {
		list: (items) => mountList(TagsDescriptor(), TagsCollectionDescriptor(), items),
		item: (elevator, source) =>
			mountItem(TagsItemDescriptor(), TagsCollectionItemDescriptor(), elevator, source),
	},
}

/**
 * Коллекции, у которых элемента из разметки нет: состав кладёт сама коллекция.
 * Дни календаря кладёт вид по месяцам сеток, `items` у него не принимается, а
 * день монтируется только над элементом из состава (`ctrl`). Строки таблицы —
 * только данными: таблица рисует строку сама, над её экземпляром.
 */
const DATA_ONLY: Readonly<Record<string, TCollectionKit>> = {
	CalendarCollectionItemDescriptor: {
		list: () => mountList(CalendarDescriptor(), CalendarCollectionDescriptor(), []),
		item: (elevator, source) =>
			mountItem(
				CalendarItemDescriptor(),
				CalendarCollectionItemDescriptor(),
				elevator,
				source,
			),
	},
	// Строки с колонкой заголовка и выбором: монтирование подписывает строку и
	// на ячейки, и на выбор строк
	TableCollectionRowDescriptor: {
		list: () => {
			const list = mountList(TableDescriptor(), TableCollectionDescriptor(), [
				{ data: { id: 1, name: 'Анна' } },
				{ data: { id: 2, name: 'Борис' } },
			])
			const { columns, selection } = list.engine.extensions

			columns.columns = [{ field: 'name', rowHeader: true }]
			selection.mode = 'multiple'

			return list
		},
		item: (elevator, source) =>
			mountItem(TableRowDescriptor(), TableCollectionRowDescriptor(), elevator, source),
	},
}

/**
 * Фасады, чей контекст берут не через вход в коллекцию: панель таба в
 * коллекцию не входит, а берёт контекст таба с тем же `value`.
 */
const PANELS: readonly string[] = ['TabsCollectionContentDescriptor']

/** Шины, которые переживают монтирование: драйвер и каждое расширение движка. */
function spyEngine(engine: TCollectionEngine<any, any>): IBusSpy[] {
	const extensions: Readonly<Record<string, unknown>> = engine.extensions

	return [
		...spyBus('driver', engine.getCore().driver),
		...Object.entries(extensions).flatMap(([key, extension]) => spyBus(key, extension)),
	]
}

/** Первый элемент состава — элемент из данных. */
const firstOf = (engine: TCollectionEngine<any, any>): object =>
	required(engine.extensions.batch.items[0], 'элемент из данных')

describe('сторож: элемент коллекции освобождает свой контекст', () => {
	it('таблица покрывает каждый фасад элемента из экспорта', () => {
		const facades = exportedDescriptors()
			.filter(
				([, descriptor]) => descriptor.ctor.prototype instanceof TCollectionItemComponent,
			)
			.map(([name]) => name)

		expect([...Object.keys(COLLECTIONS), ...Object.keys(DATA_ONLY), ...PANELS].sort()).toEqual(
			facades.sort(),
		)
	})

	it('шпионы видят подписки item-адаптеров: у ListBox — выбор, порядок и список', () => {
		const kit = required(COLLECTIONS.ListBoxCollectionItemDescriptor, 'ListBox')
		const { engine, elevator } = kit.list(SOURCES)
		const spies = spyEngine(engine)

		kit.item(elevator, { ctrl: firstOf(engine) }).unmount()

		expect(subscribed(spies)).toEqual(
			expect.arrayContaining([
				'selection: change:selection',
				'order: change:order',
				'list: change:view',
			]),
		)
	})

	describe.each(Object.entries(COLLECTIONS))('%s', (_name, kit) => {
		it('элемент из данных: после размонтирований подписок нет ни на движке, ни на элементе', () => {
			const { engine, elevator } = kit.list(SOURCES)
			const item = firstOf(engine)
			const spies = [...spyEngine(engine), ...spyBus('элемент', item)]

			for (let i = 0; i < MOUNTS; i++) cycle(() => kit.item(elevator, { ctrl: item }))

			expect(leftovers(spies)).toEqual([])
			// Данные на месте: размонтирование элемент из коллекции не удаляет
			expect(engine.extensions.batch.items).toContain(item)
		})

		it('элемент из разметки: после размонтирований подписок на движке нет', () => {
			const { engine, elevator } = kit.list([])
			const spies = spyEngine(engine)

			for (let i = 0; i < MOUNTS; i++)
				cycle(() => kit.item(elevator, { props: { value: 'm' } }))

			expect(leftovers(spies)).toEqual([])
			expect(engine.extensions.batch.items).toEqual([])
		})
	})

	describe.each(Object.entries(DATA_ONLY))('%s', (_name, kit) => {
		it('элемент из данных: после размонтирований подписок нет ни на движке, ни на элементе', () => {
			const { engine, elevator } = kit.list([])
			const item = firstOf(engine)
			const spies = [...spyEngine(engine), ...spyBus('элемент', item)]

			for (let i = 0; i < MOUNTS; i++) cycle(() => kit.item(elevator, { ctrl: item }))

			expect(leftovers(spies)).toEqual([])
			expect(engine.extensions.batch.items).toContain(item)
		})
	})
})

/**
 * `rendered = false` значит «элемента в коллекции больше нет», а не «кончилось
 * монтирование». Удалённый из коллекции элемент, пока смонтирован, перестаёт
 * рисоваться. Элемент из данных, которого спрятал фильтр, в коллекции
 * остаётся и при следующем показе обязан нарисоваться. Своё снятие элемента
 * разметки — тоже не удаление: его `ctrl` может смонтироваться снова.
 */
describe('rendered: удаление из коллекции, а не размонтирование', () => {
	const kit = required(COLLECTIONS.ListBoxCollectionItemDescriptor, 'ListBox')

	it('элемент из данных после размонтирования рисуется', () => {
		const { engine, elevator } = kit.list(SOURCES)
		const item = firstOf(engine)

		kit.item(elevator, { ctrl: item }).unmount()

		expect(Reflect.get(item, 'rendered')).toBe(true)
	})

	it('элемент из данных, удалённый из коллекции, пока смонтирован, не рисуется', () => {
		const { engine, elevator } = kit.list(SOURCES)
		const item = firstOf(engine)
		const spies = spyEngine(engine)

		cycle(() => {
			const mounted = kit.item(elevator, { ctrl: item })

			engine.extensions.plain.remove(item)

			expect(Reflect.get(item, 'rendered')).toBe(false)

			return mounted
		})

		expect(leftovers(spies)).toEqual([])
	})

	it('элемент из разметки, удалённый из коллекции, пока смонтирован, не рисуется', () => {
		const { engine, elevator } = kit.list([])
		const { instance, unmount } = kit.item(elevator, { props: { value: 'm' } })

		expect(engine.extensions.batch.items).toEqual([instance])

		engine.extensions.plain.remove(instance)

		expect(Reflect.get(instance, 'rendered')).toBe(false)

		unmount()
	})

	it('элемент разметки со своим ctrl после размонтирования рисуется и входит снова', () => {
		const { engine, elevator } = kit.list([])
		const ctrl = new TListBoxItem({ value: 'm' })

		kit.item(elevator, { ctrl }).unmount()

		expect(engine.extensions.batch.items).toEqual([])
		expect(ctrl.rendered).toBe(true)

		const { unmount } = kit.item(elevator, { ctrl })

		expect(engine.extensions.batch.items).toEqual([ctrl])
		expect(ctrl.rendered).toBe(true)

		unmount()
	})
})

/**
 * Панель таба в коллекцию не входит: она берёт контекст таба с тем же
 * `value`. Контекст — этого монтирования панели, как у элемента: снятие
 * освобождает его, а перепривязка освобождает прежний — и к другому табу, и
 * ни к какому, когда таба с новым значением нет.
 */
describe('сторож: панель таба освобождает контекст своего таба', () => {
	/** Панель, смонтированная под списком табов, и её фасад. */
	function mountPanel(elevator: TElevatorFactory, value: string) {
		const adapter = createAdapterContext(TabsContentDescriptor(), { props: { value } })
		const facade = createAdapterContext(
			TabsCollectionContentDescriptor(),
			{ props: { value } },
			{ bundle: adapter.bundle },
		).use(TTabsContentBindingExtension, { content: adapter.instance, elevator })

		return { content: adapter.instance, facade, unmount: accept([facade, adapter]) }
	}

	const tabs = () => mountList(TabsDescriptor(), TabsCollectionDescriptor(), SOURCES)

	it('после размонтирований подписок на движке и на табе нет', () => {
		const { engine, elevator } = tabs()
		const spies = [...spyEngine(engine), ...spyBus('таб', firstOf(engine))]

		for (let i = 0; i < MOUNTS; i++) cycle(() => mountPanel(elevator, 'a'))

		expect(subscribed(spies)).toContain('activation: change:activation')
		expect(leftovers(spies)).toEqual([])
	})

	it('перепривязка к другому табу освобождает контекст прежнего', () => {
		const { engine, elevator } = tabs()
		const [, b] = engine.extensions.batch.items
		const spies = spyEngine(engine)
		const { content, facade, unmount } = mountPanel(elevator, 'a')
		let changes = 0

		facade.instance.events.on('change:active', () => changes++)

		content.value = 'b'
		engine.extensions.activation.activate(b)

		// Активность панели — одна, от нового таба: прежний контекст её больше не шлёт
		expect(changes).toBe(1)
		expect(facade.instance.active).toBe(true)

		unmount()

		expect(leftovers(spies)).toEqual([])
	})

	it('значение без таба освобождает контекст прежнего: панель — ни с каким табом', () => {
		const { engine, elevator } = tabs()
		const [a, b] = engine.extensions.batch.items
		const { activation } = engine.extensions
		const spies = spyEngine(engine)
		const { content, facade, unmount } = mountPanel(elevator, 'a')
		let changes = 0

		activation.activate(a)
		facade.instance.events.on('change:active', () => changes++)

		content.value = 'z'

		// За прежний таб панель больше не отвечает: она неактивна и сказала об этом
		expect(facade.instance.context).toBeUndefined()
		expect(facade.instance.active).toBe(false)
		expect(changes).toBe(1)
		// Подписки контекста сняты: на движке панель только ждёт таб со своим значением
		expect(leftovers(spies)).toEqual(['plain: item:added'])

		// Активность прежнего таба до панели больше не доходит
		activation.activate(b)
		activation.activate(a)

		expect(changes).toBe(1)

		unmount()

		expect(leftovers(spies)).toEqual([])
	})
})
