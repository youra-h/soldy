// @vitest-environment jsdom

import { describe, it, expect, expectTypeOf, vi } from 'vitest'
import {
	createEngine,
	createEngineListBox,
	createEngineTabs,
	TButton,
	TFrame,
	TIcon,
	TListBox,
	TListBoxItem,
	TSkeleton,
	TTabs,
	TTabsContent,
	TTabsItem,
} from '@soldy-ui/core'
import type { ITabsItem, TCollectionEngine } from '@soldy-ui/core'
import {
	TActionPlugin,
	TPluginBundle,
	TDragPlugin,
	TElementPlugin,
	TFrameLayoutPlugin,
	TIconLayoutPlugin,
	TSkeletonLayoutPlugin,
	TTabsActiveTabPlugin,
	TTabsItemIdsPlugin,
} from '@soldy-ui/plugins'
import {
	createAdapterContext,
	defineComponent,
	toInstanceState,
	ButtonDescriptor,
	DragAndDropDescriptor,
	FrameDescriptor,
	IconDescriptor,
	SkeletonDescriptor,
	TabsDescriptor,
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
	DRAG_CONTEXT_ELEVATOR,
	type IAdapterContext,
	type IComponentContract,
	type TAdapterState,
} from '@soldy-ui/setup'
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

/**
 * Набор принимается вместе с контекстом (`attach()`): сборку, которую фреймворк
 * не принял, уничтожить некому, поэтому до принятия набор чужого не трогает —
 * плагины на чужие шины не подписаны, а наружу набор не объявлен.
 */
describe('принятие набора', () => {
	/** Микрозадача: на ней набор объявляется наружу. */
	const announced = () => Promise.resolve()

	/** Кнопка над своим `ctrl` и подписчики объявления — `bundle:create` и `element:create`. */
	function button() {
		const ctrl = new TButton()
		const bundleCreate = vi.fn()

		ctrl.events.on('bundle:create', bundleCreate)

		const context = createAdapterContext(ButtonDescriptor(), { ctrl })
		const elementCreate = vi.fn()

		required(context.bundle?.get(TElementPlugin), 'TElementPlugin').events.on(
			'create',
			elementCreate,
		)

		return { context, bundleCreate, elementCreate }
	}

	it('без attach() набор не объявляется: ни bundle:create, ни created() плагинов', async () => {
		const { bundleCreate, elementCreate } = button()

		await announced()

		expect(bundleCreate).not.toHaveBeenCalled()
		expect(elementCreate).not.toHaveBeenCalled()
	})

	it('после attach() объявление приходит на микрозадаче', async () => {
		const { context, bundleCreate, elementCreate } = button()

		context.attach()

		expect(bundleCreate).not.toHaveBeenCalled()

		await announced()

		expect(bundleCreate.mock.calls).toEqual([[context.bundle]])
		expect(elementCreate).toHaveBeenCalledTimes(1)
	})

	it('набор, уничтоженный между attach() и микрозадачей, не объявляется', async () => {
		const { context, bundleCreate, elementCreate } = button()

		context.attach()
		context.destroy()
		await announced()

		expect(bundleCreate).not.toHaveBeenCalled()
		expect(elementCreate).not.toHaveBeenCalled()
	})

	it('плагины приняты раньше, чем срабатывают обработчики attach у расширений', () => {
		const { context } = button()
		const order: string[] = []

		required(context.bundle?.get(TActionPlugin), 'TActionPlugin').events.on('attach', () =>
			order.push('плагин'),
		)
		context.events.on('attach', () => order.push('расширение'))
		context.attach()

		expect(order).toEqual(['плагин', 'расширение'])
	})

	/**
	 * Начальные значения внешнему `ctrl` сборка пишет до набора: плагины встают
	 * на настроенный инстанс и читают его при установке. Записанные после
	 * установки, они дошли бы до плагинов только событием, а подписка плагина
	 * начинается с принятия — первая отрисовка шла бы со старыми выходами.
	 */
	it('у внешнего ctrl выходы плагинов верны уже до attach()', () => {
		const icon = createAdapterContext(IconDescriptor(), {
			ctrl: new TIcon(),
			props: { width: 24 },
		})
		const frame = createAdapterContext(FrameDescriptor(), {
			ctrl: new TFrame(),
			props: { x: 10, y: 20 },
		})
		const snapshot = (context: IAdapterContext) =>
			context.connect(CallbackProfile).state.getSnapshot()

		expect(snapshot(icon).layout_styles).toEqual({ width: '24px', height: '' })
		expect(snapshot(frame).layout_styles).toMatchObject({ left: '10px', top: '20px' })
	})
})

/**
 * Плагин, который выводит значение из чужой шины, перечитывает его при
 * принятии: подписка начинается с принятия, и смену источника до него она не
 * застала. Здесь — плагины, у которых своей спеки нет.
 */
describe('принятие набора · пересчёт', () => {
	const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve))

	it('раскладка Icon, Skeleton и Frame: размер, сменившийся до принятия, — после принятия в стилях', () => {
		const icon = new TIcon()
		const skeleton = new TSkeleton()
		const frame = new TFrame()
		const contexts = [
			createAdapterContext(IconDescriptor(), { ctrl: icon }),
			createAdapterContext(SkeletonDescriptor(), { ctrl: skeleton }),
			createAdapterContext(FrameDescriptor(), { ctrl: frame }),
		]
		const [iconContext, skeletonContext, frameContext] = contexts
		const iconLayout = required(
			iconContext?.bundle?.get(TIconLayoutPlugin),
			'TIconLayoutPlugin',
		)
		const skeletonLayout = required(
			skeletonContext?.bundle?.get(TSkeletonLayoutPlugin),
			'TSkeletonLayoutPlugin',
		)
		const frameLayout = required(
			frameContext?.bundle?.get(TFrameLayoutPlugin),
			'TFrameLayoutPlugin',
		)

		icon.width = 24
		skeleton.width = 120
		frame.x = 10

		expect(iconLayout.styles.width).toBe('')
		expect(skeletonLayout.styles.width).toBe('auto')
		expect(frameLayout.styles.left).toBe('0px')

		for (const context of contexts) context.attach()

		expect(iconLayout.styles.width).toBe('24px')
		expect(skeletonLayout.styles.width).toBe('120px')
		expect(frameLayout.styles.left).toBe('10px')
	})

	it('Action: focused, выставленный до принятия, — после принятия фокус на корне', async () => {
		const ctrl = new TButton()
		const context = createAdapterContext(ButtonDescriptor(), { ctrl })
		const root = document.createElement('button')

		document.body.appendChild(root)
		context.bindElement(root)
		await nextFrame()

		ctrl.focused = true

		expect(document.activeElement).not.toBe(root)

		context.attach()

		expect(document.activeElement).toBe(root)

		context.destroy()
		root.remove()
	})

	it('Tabs: геометрию активного таба плагин пересчитывает при принятии', () => {
		const context = createAdapterContext(TabsDescriptor(), { ctrl: new TTabs() })
		const offset = vi.fn()

		required(context.bundle?.get(TTabsActiveTabPlugin), 'TTabsActiveTabPlugin').events.on(
			'change:active-tab',
			offset,
		)
		context.attach()

		expect(offset).toHaveBeenCalledTimes(1)

		context.destroy()
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

	it('TDragAndDropExtension опускает флаг drag-контекста вниз', () => {
		const { factory, store } = createElevatorFactory()

		const ctx = createAdapterContext(defineComponent({ ctor: class {} }), {})

		ctx.use(TDragAndDropExtension, { elevator: factory })

		expect(store.get(DRAG_CONTEXT_ELEVATOR)).toBe(true)
	})

	it('TDragAndDropCollectionExtension активирует TDragPlugin при наличии drag-контекста', () => {
		const { factory, store } = createElevatorFactory()

		// Родитель установил drag-контекст
		store.set(DRAG_CONTEXT_ELEVATOR, true)

		const engine = createEngine()
		const instance = new TEngineOwner(engine)

		const bundle = new TPluginBundle(instance)
		bundle.use(TDragPlugin)

		const ctx = createAdapterContext(
			defineComponent({ ctor: TEngineOwner }),
			{ ctrl: instance },
			{ bundle },
		)

		const activateSpy = vi.spyOn(TDragPlugin.prototype, 'activate')

		ctx.use(TDragAndDropCollectionExtension, { elevator: factory })

		expect(activateSpy).toHaveBeenCalledWith(engine)

		activateSpy.mockRestore()
	})

	it('TDragAndDropCollectionExtension не активирует плагин без drag-контекста', () => {
		const { factory } = createElevatorFactory()

		const instance = new TEngineOwner(createEngine())

		const bundle = new TPluginBundle(instance)
		bundle.use(TDragPlugin)

		const ctx = createAdapterContext(
			defineComponent({ ctor: TEngineOwner }),
			{ ctrl: instance },
			{ bundle },
		)

		const activateSpy = vi.spyOn(TDragPlugin.prototype, 'activate')

		ctx.use(TDragAndDropCollectionExtension, { elevator: factory })

		expect(activateSpy).not.toHaveBeenCalled()

		activateSpy.mockRestore()
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
			{ item, elevator: factory },
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
 * таба от монтирования таба, и панель берёт ровно их.
 */
describe('TTabsContentBindingExtension: сборка и вход', () => {
	/** Монтирование таба: его плагин связок пишет `id` от id монтирования. */
	const mountTab = (tab: ITabsItem, mountId = `tab-${tab.value}`) =>
		new TPluginBundle(tab, mountId).use(TTabsItemIdsPlugin)

	/** Движок Tabs под лифтом и панель `a`, собранная под ним. */
	function assemblePanel(items: ReadonlyArray<{ value: string; text: string }> = []) {
		const { factory, store } = createElevatorFactory()
		const engine = createEngineTabs({ owner: new TTabs(), items: [...items] })

		store.set(ITEM_CONTEXT_ELEVATOR, engine)
		// Список табов рисуется раньше панелей: табы из данных уже смонтированы
		engine.extensions.batch.items.forEach((tab) => mountTab(tab))

		const content = new TTabsContent({ value: 'a' })
		const context = createAdapterContext(TabsCollectionContentDescriptor(), {}).use(
			TTabsContentBindingExtension,
			{ content, elevator: factory },
		)
		const push = (value: string) => {
			const tab = new TTabsItem({ value, text: value.toUpperCase() })

			mountTab(tab)

			return engine.extensions.plain.push(tab)
		}

		return { engine, content, context, push }
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
		const { engine, content, context } = assemblePanel([{ value: 'a', text: 'A' }])
		const [tab] = engine.extensions.batch.items

		context.attach()
		mountTab(tab, 'again')

		expect(panelSide(content)).toEqual({ id: 'again-panel', labelledBy: 'again-tab' })
	})

	it('destroy снимает подписки и связку панели', () => {
		const { engine, content, context, push } = assemblePanel([{ value: 'a', text: 'A' }])
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
})
