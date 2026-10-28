// @vitest-environment jsdom

import { describe, it, expect, expectTypeOf, vi } from 'vitest'
import {
	createEngine,
	createEngineListBox,
	createEngineTabs,
	TListBox,
	TListBoxItem,
	TTabs,
	TTabsContent,
	TTabsItem,
} from '@soldy-ui/core'
import type { ITabsItem, TCollectionEngine } from '@soldy-ui/core'
import {
	TPluginBundle,
	TCollectionBundlesPlugin,
	TDragPlugin,
	TElementPlugin,
	TFrameLayoutPlugin,
	TIdPlugin,
	TTabsItemIdsPlugin,
} from '@soldy-ui/plugins'
import {
	createAdapterContext,
	defineComponent,
	toInstanceState,
	ButtonDescriptor,
	DragAndDropDescriptor,
	FrameDescriptor,
	ListBoxCollectionItemDescriptor,
	TabsCollectionContentDescriptor,
	TElevator,
	TCollectionExtension,
	TCollectionItemExtension,
	TTabsContentBindingExtension,
	TDragAndDropExtension,
	TDragAndDropCollectionExtension,
	COLLECTION_ENGINE_ELEVATOR,
	ITEM_CONTEXT_ELEVATOR,
	type IAdapterContext,
	type IComponentContract,
	type TAdapterState,
	type TElevatorFactory,
} from '@soldy-ui/setup'
import { COLLECTION_BUNDLES_ELEVATOR } from '../content/extensions/collection/keys'
import { DRAG_AND_DROP_ELEVATOR } from '../content/extensions/drag-and-drop/keys'
import { CallbackProfile, createElevatorFactory, required } from './helpers'

/**
 * Фасад-заглушка: движок и привязка владельца — всё, что нужно коллекционным
 * расширениям. Владельца у заглушки нет, привязывать нечего.
 */
class TEngineOwner {
	constructor(readonly engine: TCollectionEngine<any, any>) {}

	bindOwner(): void {}

	releaseOwner(): void {}
}

describe('TElevator', () => {
	class TestElevator extends TElevator<unknown> {
		down(): void {}
		up(): unknown {
			return undefined
		}
		get key(): symbol {
			return this._key
		}
	}

	it('кэширует одинаковые строковые ключи в один символ', () => {
		const a = new TestElevator('same')
		const b = new TestElevator('same')
		const c = new TestElevator('other')

		expect(a.key).toBe(b.key)
		expect(a.key).not.toBe(c.key)
	})
})

describe('createAdapterContext', () => {
	it('создаёт instance через ctor дескриптора', () => {
		class Simple {
			value = 1
		}

		const ctx = createAdapterContext(defineComponent({ ctor: Simple }), {})

		expect(ctx.instance).toBeInstanceOf(Simple)
	})

	it('использует готовый ctrl без вызова конструктора', () => {
		class Simple {}
		const ctrl = new Simple()

		const ctx = createAdapterContext(defineComponent({ ctor: Simple }), { ctrl })

		expect(ctx.instance).toBe(ctrl)
	})

	it('передаёт props в конструктор и хранит descriptor', () => {
		class WithProps {
			text: string
			constructor(props: { text?: string }) {
				this.text = props.text ?? ''
			}
		}

		const descriptor = defineComponent({ ctor: WithProps })
		const ctx = createAdapterContext(descriptor, { props: { text: 'hi' } })

		expect(ctx.instance.text).toBe('hi')
		expect(ctx.descriptor).toBe(descriptor)
	})

	it('bindElement кладёт не-HTML узел в плагин как есть', () => {
		// Корнем компонента бывает `svg`: `tag` — свободный проп. Контекст узел
		// не сужает и не подменяет на `null` — иначе плагины остались бы без узла
		// молча.
		const ctx = createAdapterContext(ButtonDescriptor(), {})
		const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')

		ctx.bindElement(svg)

		expect(required(ctx.bundle?.get(TElementPlugin), 'TElementPlugin').element).toBe(svg)
	})

	it('bindElement у компонента без TElementPlugin ничего не делает', () => {
		// DragAndDrop наследует ComponentDescriptor (headless), плагина элемента
		// нет: привязывать узел не к чему, и адаптеру не нужно об этом помнить.
		const ctx = createAdapterContext(DragAndDropDescriptor(), {})

		expect(() => ctx.bindElement(document.createElement('div'))).not.toThrow()
	})

	it('destroy отвязывает узел до уничтожения набора', () => {
		const ctx = createAdapterContext(ButtonDescriptor(), {})
		const plugin = required(ctx.bundle?.get(TElementPlugin), 'TElementPlugin')

		ctx.bindElement(document.createElement('div'))
		ctx.destroy()

		expect(plugin.element).toBeNull()
	})

	it('регистрирует и возвращает расширения через use/get', () => {
		class MyExt {
			constructor(
				public readonly context: IAdapterContext,
				public readonly opts?: { x: number },
			) {}
		}

		const ctx = createAdapterContext(defineComponent({ ctor: class {} }), {})

		ctx.use(MyExt, { x: 1 })

		expect(ctx.get(MyExt)).toBeInstanceOf(MyExt)
		expect(required(ctx.get(MyExt), 'расширение MyExt').opts).toEqual({ x: 1 })
	})

	it('destroy эмитит событие и очищает расширения', () => {
		class MyExt {
			constructor(public readonly context: IAdapterContext) {}
		}

		const ctx = createAdapterContext(defineComponent({ ctor: class {} }), {})

		let destroyed = false
		ctx.events.on('destroy', () => {
			destroyed = true
		})

		ctx.use(MyExt)
		ctx.destroy()

		expect(destroyed).toBe(true)
		expect(ctx.get(MyExt)).toBeUndefined()
	})

	it('тип контекста несёт выходы плагинов дескриптора', () => {
		// Как `useAdapter` адаптеров: инстанс и выходы выводятся из контракта в
		// типе контекста, дженерики не передаются. Проверяет это «Типы — Setup»
		const stateOf = <C extends IComponentContract>(
			adapter: IAdapterContext<C>,
		): TAdapterState<C> =>
			toInstanceState<C>(adapter.connect(CallbackProfile).state.getSnapshot())

		const frame = createAdapterContext(FrameDescriptor(), {})
		const state = stateOf(frame)

		expectTypeOf(state.layout_styles).toEqualTypeOf<TFrameLayoutPlugin['styles'] | undefined>()
		expect(state.layout_styles).toEqual(
			required(frame.bundle?.get(TFrameLayoutPlugin), 'TFrameLayoutPlugin').styles,
		)

		// Выходы — свои у каждого дескриптора: у Button их нет
		const button = createAdapterContext(ButtonDescriptor(), {})

		// @ts-expect-error — `layout_styles` не выход ни одного плагина Button
		expect(stateOf(button).layout_styles).toBeUndefined()

		frame.destroy()
		button.destroy()
	})
})

describe('расширения коллекций', () => {
	it('TCollectionExtension опускает engine и регистрирует item через elevator', () => {
		const { factory, store } = createElevatorFactory()

		const engine = createEngine()
		const push = vi.spyOn(engine.extensions.plain, 'push')
		const remove = vi.spyOn(engine.extensions.plain, 'remove')

		const ctx = createAdapterContext(defineComponent({ ctor: TEngineOwner }), {
			ctrl: new TEngineOwner(engine),
		})

		ctx.use(TCollectionExtension, { elevator: factory })

		expect(store.get(ITEM_CONTEXT_ELEVATOR)).toBe(engine)

		const register = required(factory(COLLECTION_ENGINE_ELEVATOR).up(), 'регистратор элемента')

		const item = { uid: 'a' }
		const cleanup = register(item, null)

		expect(push).toHaveBeenCalledWith(item)

		cleanup()
		expect(remove).toHaveBeenCalledWith(item)
	})

	/**
	 * Реестр — детям, которые в коллекцию не входят, а с её элементами связаны
	 * (панель Tabs). Владелец без реестра опускает пустое: реестр коллекции
	 * выше достался бы детям чужого движка.
	 */
	it('TCollectionExtension опускает рядом с движком реестр наборов, без реестра — пустое', () => {
		const { factory, store } = createElevatorFactory()
		const instance = new TEngineOwner(createEngine())
		const bundle = new TPluginBundle(instance).use(TCollectionBundlesPlugin)

		createAdapterContext(
			defineComponent({ ctor: TEngineOwner }),
			{ ctrl: instance },
			{ bundle },
		).use(TCollectionExtension, { elevator: factory })

		expect(store.get(COLLECTION_BUNDLES_ELEVATOR)).toBe(bundle.get(TCollectionBundlesPlugin))

		createAdapterContext(defineComponent({ ctor: TEngineOwner }), {
			ctrl: new TEngineOwner(createEngine()),
		}).use(TCollectionExtension, { elevator: factory })

		expect(store.get(COLLECTION_BUNDLES_ELEVATOR)).toBeNull()
	})

	it('элемент из данных не удаляется при размонтировании', () => {
		const { factory } = createElevatorFactory()

		const item = { uid: 'a' }

		// элемент уже в коллекции — пришёл из `items`, разметка им не владеет
		const engine = createEngine({ items: [item] })
		const push = vi.spyOn(engine.extensions.plain, 'push')
		const remove = vi.spyOn(engine.extensions.plain, 'remove')

		const ctx = createAdapterContext(defineComponent({ ctor: TEngineOwner }), {
			ctrl: new TEngineOwner(engine),
		})

		ctx.use(TCollectionExtension, { elevator: factory })

		const register = required(factory(COLLECTION_ENGINE_ELEVATOR).up(), 'регистратор элемента')
		const cleanup = register(item, null)

		// повторно добавлять нечего
		expect(push).not.toHaveBeenCalled()

		cleanup()

		// и удалять тоже: фильтр сузил выдачу, ушла страница таблицы —
		// данные при этом на месте
		expect(remove).not.toHaveBeenCalled()
	})

	it('элемент из разметки удаляется при размонтировании', () => {
		const { factory } = createElevatorFactory()

		// коллекция пуста — элемент создаёт сама разметка
		const engine = createEngine()
		const push = vi.spyOn(engine.extensions.plain, 'push')
		const remove = vi.spyOn(engine.extensions.plain, 'remove')

		const ctx = createAdapterContext(defineComponent({ ctor: TEngineOwner }), {
			ctrl: new TEngineOwner(engine),
		})

		ctx.use(TCollectionExtension, { elevator: factory })

		const item = { uid: 'b' }
		const register = required(factory(COLLECTION_ENGINE_ELEVATOR).up(), 'регистратор элемента')
		const cleanup = register(item, null)

		expect(push).toHaveBeenCalledWith(item)

		cleanup()

		expect(remove).toHaveBeenCalledWith(item)
	})

	it('TCollectionExtension не подключается к инстансу без engine', () => {
		const { factory } = createElevatorFactory()

		const ctx = createAdapterContext(defineComponent({ ctor: class {} }), {})

		// Компилятор такое подключение не пропускает; проверка в рантайме — для
		// потребителя без типов.
		// @ts-expect-error — у инстанса нет engine
		expect(() => ctx.use(TCollectionExtension, { elevator: factory })).toThrow(
			'Engine is not available in the engine instance.',
		)
	})

	it('TDragAndDropExtension опускает по ключу свой экземпляр', () => {
		const { factory, store } = createElevatorFactory()

		const ctx = createAdapterContext(DragAndDropDescriptor(), {})

		ctx.use(TDragAndDropExtension, { elevator: factory })

		expect(store.get(DRAG_AND_DROP_ELEVATOR)).toBe(ctx.instance)
	})
})

/**
 * Перестановка — обёртка `DragAndDrop` и подхват её коллекцией, без
 * фреймворка. Обёртка опускает по лифту свой экземпляр, коллекция берёт его
 * при сборке и включает им плагин перетаскивания своего набора — движком и
 * обёрткой: жест плагин переводит в команду обёртки. Своему поддереву
 * коллекция опускает пустое значение. Лифт здесь — в памяти, без дерева:
 * значение, которое коллекция опустила, видит следующая коллекция, как
 * вложенная.
 */
describe('TDragAndDropCollectionExtension', () => {
	/** Коллекция под лифтом: свой движок и набор с плагином перетаскивания. */
	function assembleCollection(factory: TElevatorFactory) {
		const engine = createEngine()
		const instance = new TEngineOwner(engine)
		const bundle = new TPluginBundle(instance).use(TDragPlugin)
		const context = createAdapterContext(
			defineComponent({ ctor: TEngineOwner }),
			{ ctrl: instance },
			{ bundle },
		)

		context.use(TDragAndDropCollectionExtension, { elevator: factory })

		return { engine }
	}

	/** Обёртка над лифтом — её экземпляр. */
	const wrap = (factory: TElevatorFactory) =>
		createAdapterContext(DragAndDropDescriptor(), {}).use(TDragAndDropExtension, {
			elevator: factory,
		}).instance

	it('под обёрткой включает плагин движком коллекции и обёрткой', () => {
		const { factory } = createElevatorFactory()
		const activate = vi.spyOn(TDragPlugin.prototype, 'activate')

		try {
			const dragAndDrop = wrap(factory)
			const { engine } = assembleCollection(factory)

			expect(activate).toHaveBeenCalledTimes(1)
			expect(activate).toHaveBeenCalledWith(engine, dragAndDrop)
		} finally {
			activate.mockRestore()
		}
	})

	it('своему поддереву опускает пустое: коллекция в её элементах перестановку не наследует', () => {
		const { factory, store } = createElevatorFactory()
		const activate = vi.spyOn(TDragPlugin.prototype, 'activate')

		try {
			wrap(factory)

			const outer = assembleCollection(factory)

			expect(store.get(DRAG_AND_DROP_ELEVATOR)).toBeNull()

			// Коллекция внутри элемента первой видит то, что та опустила
			assembleCollection(factory)

			expect(activate.mock.calls.map(([engine]) => engine)).toEqual([outer.engine])
		} finally {
			activate.mockRestore()
		}
	})

	it('без обёртки плагин не включает', () => {
		const { factory } = createElevatorFactory()
		const activate = vi.spyOn(TDragPlugin.prototype, 'activate')

		try {
			assembleCollection(factory)

			expect(activate).not.toHaveBeenCalled()
		} finally {
			activate.mockRestore()
		}
	})
})

/**
 * Элемент коллекции собирается и входит в коллекцию на разных фазах контекста.
 *
 * Сборка (`use`) берёт движок и регистратор через лифт и отдаёт фасаду контекст
 * элемента — чужого хранилища она не трогает. Вход — регистрация и `meta` — на
 * `attach` контекста: фреймворк принял компонент. У React сборка идёт на
 * рендере, и отброшенный рендер иначе оставил бы в движке фантом.
 */
describe('TCollectionItemExtension: сборка и вход', () => {
	/** Список с движком ListBox и элемент разметки, собранный под ним. */
	function assembleItem(props: object = {}) {
		const { factory } = createElevatorFactory()
		const engine = createEngineListBox({ owner: new TListBox() })
		const owner = createAdapterContext(defineComponent({ ctor: TEngineOwner }), {
			ctrl: new TEngineOwner(engine),
		})

		owner.use(TCollectionExtension, { elevator: factory })

		const item = new TListBoxItem({ value: 'a', text: 'a' })
		const context = createAdapterContext(ListBoxCollectionItemDescriptor(), { props }).use(
			TCollectionItemExtension,
			{ adapter: { instance: item, detach: () => {} }, elevator: factory },
		)

		return { engine, item, context }
	}

	it('до attach контекст элемента есть, а в движке элемента нет', () => {
		const { engine, context } = assembleItem()

		expect(context.instance.context).toBeDefined()
		expect(engine.extensions.batch.items).toEqual([])
	})

	it('attach добавляет элемент и применяет meta из пропсов сборки', () => {
		const { engine, item, context } = assembleItem({ selected: true })

		expect(engine.extensions.selection.isSelected(item)).toBe(false)

		context.attach()

		expect(engine.extensions.batch.items).toEqual([item])
		expect(engine.extensions.selection.isSelected(item)).toBe(true)
	})

	it('уничтожение контекста снимает элемент', () => {
		const { engine, context } = assembleItem()

		context.attach()
		context.destroy()

		expect(engine.extensions.batch.items).toEqual([])
	})

	it('после connect() расширение не ставится: пропсы сборки для meta контекст уже отпустил', () => {
		// Пустой `meta` молча потерял бы `selected` из разметки — поэтому ошибка
		const { factory } = createElevatorFactory()
		const context = createAdapterContext(ListBoxCollectionItemDescriptor(), {
			props: { selected: true },
		})

		context.connect(CallbackProfile)

		expect(() =>
			context.use(TCollectionItemExtension, {
				adapter: {
					instance: new TListBoxItem({ value: 'a', text: 'a' }),
					detach: () => {},
				},
				elevator: factory,
			}),
		).toThrow('TCollectionItemExtension ставится до connect()')
	})
})

/**
 * Панель Tabs в коллекцию не входит, но фазы у неё те же. Сборка связывает
 * панель с табом, который уже в коллекции (таб из данных), и пишет только
 * своё — фасад и `aria` панели. Подписки на движок, `value` и таб и второй
 * поиск — на `attach`: таб разметки входит в коллекцию на своём `attach`, а
 * подписка, заведённая сборкой, у React осталась бы на чужой шине от
 * отброшенного рендера.
 *
 * Своей формулы `id` у панели нет: `id` таба и `id` его панели записал плагин
 * таба от монтирования таба, и панель берёт ровно их. `id`, который панели
 * задало приложение (её `TIdPlugin`), главнее: он на панели с первой
 * отрисовки, а плагин таба ведёт на него `aria-controls`, когда принятая
 * панель отдала ему свой `TIdPlugin`, — набор таба она берёт в реестре
 * наборов коллекции, который владелец опускает рядом с движком.
 */
describe('TTabsContentBindingExtension: сборка и вход', () => {
	const mounts = new Map<ITabsItem, TPluginBundle>()

	/** `TIdPlugin` последнего монтирования таба: `id` приложения пишется в него. */
	const idPluginOfTab = (tab: ITabsItem) =>
		required(mounts.get(tab)?.get(TIdPlugin), 'TIdPlugin таба')

	/**
	 * Монтирование таба, как у дескриптора: `TIdPlugin` — `id` приложения, — и
	 * плагин связок, который пишет его или `id` от монтирования.
	 */
	const assembleTab = (tab: ITabsItem, mountId = `tab-${tab.value}`) => {
		const bundle = new TPluginBundle(tab, mountId).use(TIdPlugin).use(TTabsItemIdsPlugin)

		mounts.set(tab, bundle)

		return bundle
	}

	/**
	 * Движок Tabs и реестр наборов его табов под лифтом и панель `a`, собранная
	 * под ним. `panelId` — `id`, который панели задало приложение: её
	 * `TIdPlugin` получает его сборкой, раньше связки.
	 */
	function assemblePanel(
		items: ReadonlyArray<{ value: string; text: string }> = [],
		panelId?: string,
	) {
		const { factory, store } = createElevatorFactory()
		const owner = new TTabs()
		const engine = createEngineTabs({ owner, items: [...items] })
		const registry = required(
			new TPluginBundle(owner).use(TCollectionBundlesPlugin).get(TCollectionBundlesPlugin),
			'реестр наборов',
		)

		registry.bindEngine(engine)
		store.set(ITEM_CONTEXT_ELEVATOR, engine)
		store.set(COLLECTION_BUNDLES_ELEVATOR, registry)

		/** Таб собран и принят: его набор — в реестре, как у `TCollectionExtension`. */
		const mountTab = (tab: ITabsItem, mountId?: string) =>
			registry.register(assembleTab(tab, mountId), tab)

		// Список табов рисуется раньше панелей: табы из данных уже смонтированы
		engine.extensions.batch.items.forEach((tab) => mountTab(tab))

		const content = new TTabsContent({ value: 'a' })
		const bundle = new TPluginBundle(content, 'panel').use(TIdPlugin)
		const panelIdPlugin = required(bundle.get(TIdPlugin), 'TIdPlugin панели')

		panelIdPlugin.id = panelId

		const context = createAdapterContext(TabsCollectionContentDescriptor(), {}, { bundle }).use(
			TTabsContentBindingExtension,
			{ adapter: { instance: content, detach: () => {} }, elevator: factory },
		)

		/** Таб разметки входит в коллекцию на своём входе, а его набор в реестр — следом. */
		const push = (value: string) => {
			const tab = new TTabsItem({ value, text: value.toUpperCase() })
			const tabBundle = assembleTab(tab)
			const pushed = engine.extensions.plain.push(tab)

			registry.register(tabBundle, tab)

			return pushed
		}

		return { engine, content, context, push, mountTab, panelIdPlugin }
	}

	/** Сторона панели в связке: `id` и ссылка на таб. */
	const panelSide = (content: TTabsContent) => ({
		id: content.aria.get('id'),
		labelledBy: content.aria.get('aria-labelledby'),
	})

	it('таб из данных связывается уже в сборке: фасад и aria панели', () => {
		const { engine, content, context } = assemblePanel([{ value: 'a', text: 'A' }])
		const [tab] = engine.extensions.batch.items

		expect(context.instance.item).toBe(tab)
		expect(panelSide(content)).toEqual({ id: 'tab-a-panel', labelledBy: 'tab-a-tab' })
	})

	it('до attach таб, вошедший после сборки, панель не находит', () => {
		const { content, context, push } = assemblePanel()

		push('a')

		expect(context.instance.item).toBeUndefined()
		expect(panelSide(content)).toEqual({ id: undefined, labelledBy: undefined })
	})

	it('attach находит таб, вошедший после сборки', () => {
		const { content, context, push } = assemblePanel()
		const tab = push('a')

		context.attach()

		expect(context.instance.item).toBe(tab)
		expect(panelSide(content)).toEqual({ id: 'tab-a-panel', labelledBy: 'tab-a-tab' })
	})

	it('после attach панель следит за составом и своим value', () => {
		const { content, context, push } = assemblePanel()

		context.attach()

		const a = push('a')

		expect(context.instance.item).toBe(a)

		const b = push('b')

		content.value = 'b'

		expect(context.instance.item).toBe(b)
		expect(panelSide(content)).toEqual({ id: 'tab-b-panel', labelledBy: 'tab-b-tab' })
	})

	it('таб смонтировали заново — панель идёт за его новыми id', () => {
		const { engine, content, context, mountTab } = assemblePanel([{ value: 'a', text: 'A' }])
		const [tab] = engine.extensions.batch.items

		context.attach()
		mountTab(tab, 'again')

		expect(panelSide(content)).toEqual({ id: 'again-panel', labelledBy: 'again-tab' })
	})

	/**
	 * `id` таба, заданный приложением, главнее `id` от монтирования: его пишет в
	 * набор таба плагин таба, и панель ссылается на него. Своего `id` у панели
	 * здесь нет, её `id` — формула таба.
	 */
	it('id таба задали — панель идёт за ним, сняли — снова id от монтирования', () => {
		const { engine, content, context } = assemblePanel([{ value: 'a', text: 'A' }])
		const [tab] = engine.extensions.batch.items

		context.attach()
		idPluginOfTab(tab).id = 'settings'

		expect(panelSide(content)).toEqual({ id: 'tab-a-panel', labelledBy: 'settings' })

		idPluginOfTab(tab).id = undefined

		expect(panelSide(content)).toEqual({ id: 'tab-a-panel', labelledBy: 'tab-a-tab' })
	})

	/**
	 * Подписка на таб ждёт входа, а таб пишет свой набор и между сборкой панели
	 * и её входом: у React сборка — на рендере, а `id` таба приходит его эффектом,
	 * раньше входа панели. Вход берёт то, что таб записал с тех пор.
	 */
	it('таб сменил id между сборкой панели и её входом — вход берёт новый', () => {
		const { engine, content, context } = assemblePanel([{ value: 'a', text: 'A' }])
		const [tab] = engine.extensions.batch.items

		idPluginOfTab(tab).id = 'settings'

		expect(panelSide(content)).toEqual({ id: 'tab-a-panel', labelledBy: 'tab-a-tab' })

		context.attach()

		expect(panelSide(content)).toEqual({ id: 'tab-a-panel', labelledBy: 'settings' })
	})

	it('destroy снимает подписки и связку панели', () => {
		const { engine, content, context, push, mountTab } = assemblePanel([
			{ value: 'a', text: 'A' },
		])
		const [tab] = engine.extensions.batch.items

		context.attach()
		context.destroy()

		expect(panelSide(content)).toEqual({ id: undefined, labelledBy: undefined })

		// Подписки сняты: ни новый таб, ни смена value, ни новые id таба панель
		// не связывают
		push('b')
		content.value = 'b'
		mountTab(tab, 'again')

		expect(panelSide(content)).toEqual({ id: undefined, labelledBy: undefined })
	})

	it('собранная, но не принятая панель при destroy снимает связку сборки', () => {
		const { content, context } = assemblePanel([{ value: 'a', text: 'A' }])

		expect(content.aria.get('id')).toBe('tab-a-panel')

		context.destroy()

		expect(panelSide(content)).toEqual({ id: undefined, labelledBy: undefined })
	})

	it('роль панели — её собственная, связка её не трогает', () => {
		const { content, context } = assemblePanel([{ value: 'a', text: 'A' }])

		context.destroy()

		expect(content.aria.get('role')).toBe('tabpanel')
	})

	/** `aria-controls` таба: на панель ведёт его плагин связок. */
	const controlsOf = (tab: ITabsItem) => tab.aria.get('aria-controls')

	/**
	 * Свой `id` панели — на ней уже в сборке, а таб, нарисованный раньше
	 * панели, ведёт на формулу, пока панель не принята: сборка таба не трогает.
	 * Вход отдаёт плагину таба `TIdPlugin` панели, и ссылка ведёт на её `id`.
	 */
	it('id панели задан — на панели со сборки, ссылка таба на него — со входа', () => {
		const { engine, content, context } = assemblePanel([{ value: 'a', text: 'A' }], 'general')
		const [tab] = engine.extensions.batch.items

		expect(panelSide(content)).toEqual({ id: 'general', labelledBy: 'tab-a-tab' })
		expect(controlsOf(tab)).toBe('tab-a-panel')

		context.attach()

		expect(panelSide(content)).toEqual({ id: 'general', labelledBy: 'tab-a-tab' })
		expect(controlsOf(tab)).toBe('general')
	})

	it('id панели сменили — панель и ссылка таба идут за ним, сняли — обе на формуле', () => {
		const { engine, content, context, panelIdPlugin } = assemblePanel(
			[{ value: 'a', text: 'A' }],
			'general',
		)
		const [tab] = engine.extensions.batch.items

		context.attach()
		panelIdPlugin.id = 'common'

		expect(content.aria.get('id')).toBe('common')
		expect(controlsOf(tab)).toBe('common')

		panelIdPlugin.id = undefined

		expect(content.aria.get('id')).toBe('tab-a-panel')
		expect(controlsOf(tab)).toBe('tab-a-panel')

		// Задали панели без своего `id` — ссылка таба уходит на него
		panelIdPlugin.id = 'general'

		expect(content.aria.get('id')).toBe('general')
		expect(controlsOf(tab)).toBe('general')
	})

	/**
	 * Таб разметки входит в коллекцию на своём входе, а его набор в реестр —
	 * следом: на `item:added` плагина таба в реестре ещё нет, и ссылку он
	 * получает с регистрацией набора.
	 */
	it('таб вошёл после панели — ссылка таба на id панели с регистрацией его набора', () => {
		const { content, context, push } = assemblePanel([], 'general')

		context.attach()

		const tab = push('a')

		expect(panelSide(content)).toEqual({ id: 'general', labelledBy: 'tab-a-tab' })
		expect(controlsOf(tab)).toBe('general')
	})

	it('таб смонтировали заново — новый плагин таба ведёт на id панели', () => {
		const { engine, content, context, mountTab } = assemblePanel(
			[{ value: 'a', text: 'A' }],
			'general',
		)
		const [tab] = engine.extensions.batch.items

		context.attach()
		mountTab(tab, 'again')

		expect(panelSide(content)).toEqual({ id: 'general', labelledBy: 'again-tab' })
		expect(controlsOf(tab)).toBe('general')
	})

	it('панель ушла к другому табу — прежний снова на формуле, новый ведёт на неё', () => {
		const { engine, content, context } = assemblePanel(
			[
				{ value: 'a', text: 'A' },
				{ value: 'b', text: 'B' },
			],
			'general',
		)
		const [a, b] = engine.extensions.batch.items

		context.attach()
		content.value = 'b'

		expect(panelSide(content)).toEqual({ id: 'general', labelledBy: 'tab-b-tab' })
		expect(controlsOf(a)).toBe('tab-a-panel')
		expect(controlsOf(b)).toBe('general')
	})

	/** `id` приложения — узла панели, а не связки: он остаётся и без таба. */
	it('панель без таба — свой id на ней, ссылки на таб нет', () => {
		const { engine, content, context } = assemblePanel([{ value: 'a', text: 'A' }], 'general')
		const [tab] = engine.extensions.batch.items

		context.attach()
		content.value = 'z'

		expect(panelSide(content)).toEqual({ id: 'general', labelledBy: undefined })
		expect(controlsOf(tab)).toBe('tab-a-panel')
	})

	it('destroy — ссылка таба снова на формуле, за id панели таб не следит', () => {
		const { engine, content, context, panelIdPlugin } = assemblePanel(
			[{ value: 'a', text: 'A' }],
			'general',
		)
		const [tab] = engine.extensions.batch.items

		context.attach()
		context.destroy()

		expect(panelSide(content)).toEqual({ id: undefined, labelledBy: undefined })
		expect(controlsOf(tab)).toBe('tab-a-panel')

		panelIdPlugin.id = 'common'

		expect(panelSide(content)).toEqual({ id: undefined, labelledBy: undefined })
		expect(controlsOf(tab)).toBe('tab-a-panel')
	})

	/** Отброшенный рендер React: сборка была, входа нет — таб чужой, его не трогали. */
	it('собранная, но не принятая панель ссылку таба не трогает', () => {
		const { engine, content, context } = assemblePanel([{ value: 'a', text: 'A' }], 'general')
		const [tab] = engine.extensions.batch.items

		context.destroy()

		expect(content.aria.has('id')).toBe(false)
		expect(controlsOf(tab)).toBe('tab-a-panel')
	})

	/**
	 * Реестр ближайшей коллекции бывает не того владельца, что движок: тогда
	 * плагина таба в нём нет, и ссылку таба панель не берёт.
	 */
	it('реестр другой коллекции панель не берёт', () => {
		const { factory, store } = createElevatorFactory()
		const engine = createEngineTabs({ owner: new TTabs(), items: [{ value: 'a', text: 'A' }] })
		const other = new TCollectionBundlesPlugin()
		const [tab] = engine.extensions.batch.items
		const content = new TTabsContent({ value: 'a' })
		const bundle = new TPluginBundle(content, 'panel').use(TIdPlugin)

		other.bindEngine(createEngineTabs({ owner: new TTabs() }))
		other.register(assembleTab(tab), tab)
		required(bundle.get(TIdPlugin), 'TIdPlugin панели').id = 'general'
		store.set(ITEM_CONTEXT_ELEVATOR, engine)
		store.set(COLLECTION_BUNDLES_ELEVATOR, other)

		createAdapterContext(TabsCollectionContentDescriptor(), {}, { bundle })
			.use(TTabsContentBindingExtension, {
				adapter: { instance: content, detach: () => {} },
				elevator: factory,
			})
			.attach()

		expect(content.aria.get('id')).toBe('general')
		expect(controlsOf(tab)).toBe('tab-a-panel')
	})
})
