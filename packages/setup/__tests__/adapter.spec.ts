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
import type { TCollectionEngine } from '@soldy-ui/core'
import { TPluginBundle, TDragPlugin, TElementPlugin, TFrameLayoutPlugin } from '@soldy-ui/plugins'
import {
	createAdapterContext,
	defineComponent,
	toInstanceState,
	ButtonDescriptor,
	DragAndDropDescriptor,
	FrameDescriptor,
	ListBoxCollectionDescriptor,
	ListBoxCollectionItemDescriptor,
	ListBoxDescriptor,
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
 * Фасад-заглушка: у инстанса есть движок и уход вместе с контекстом — всё, что
 * нужно коллекционным расширениям.
 */
class TEngineOwner {
	destroyed = false

	constructor(readonly engine: TCollectionEngine<any, any>) {}

	destroy(): void {
		this.destroyed = true
	}
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

	it('уничтожение контекста уничтожает фасад: фасад собран этим контекстом', () => {
		const { factory } = createElevatorFactory()
		const instance = new TEngineOwner(createEngine())
		const ctx = createAdapterContext(defineComponent({ ctor: TEngineOwner }), {
			ctrl: instance,
		})

		ctx.use(TCollectionExtension, { elevator: factory })

		expect(instance.destroyed).toBe(false)

		ctx.destroy()

		expect(instance.destroyed).toBe(true)
	})

	/**
	 * Готовый движок переживает монтирование. Уходящий фасад отпускает его, и
	 * список, собранный заново с новым владельцем, получает движок целиком: без
	 * предупреждения о двух владельцах и со своим `value`.
	 */
	it('уничтожение контекста фасада отпускает движок следующему владельцу', () => {
		const warn = vi.spyOn(console, 'warn')
		const engine = createEngine({ items: [{ value: 'a' }, { value: 'b' }] })
		const mount = (value: string) => {
			const { factory } = createElevatorFactory()
			const owner = createAdapterContext(ListBoxDescriptor(), { props: { value } })
			const facade = createAdapterContext(
				ListBoxCollectionDescriptor(),
				{ options: { owner: owner.instance, engine } },
				{ bundle: owner.bundle },
			).use(TCollectionExtension, { elevator: factory })

			return { owner, facade }
		}

		const first = mount('a')

		first.facade.destroy()
		first.owner.destroy()

		const second = mount('b')

		expect(warn).not.toHaveBeenCalled()
		expect(second.facade.instance.selected.map((item) => item.value)).toEqual(['b'])

		warn.mockRestore()
		second.facade.destroy()
		second.owner.destroy()
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
 * своё — фасад и `aria` панели. Подписки на движок и `value` и второй поиск —
 * на `attach`: таб разметки входит в коллекцию на своём `attach`, а подписка,
 * заведённая сборкой, у React осталась бы на шине движка от отброшенного
 * рендера.
 */
describe('TTabsContentBindingExtension: сборка и вход', () => {
	/** Движок Tabs под лифтом и панель `a`, собранная под ним. */
	function assemblePanel(items: ReadonlyArray<{ value: string; text: string }> = []) {
		const { factory, store } = createElevatorFactory()
		const engine = createEngineTabs({ owner: new TTabs(), items: [...items] })

		store.set(ITEM_CONTEXT_ELEVATOR, engine)

		const content = new TTabsContent({ value: 'a' })
		const context = createAdapterContext(TabsCollectionContentDescriptor(), {}).use(
			TTabsContentBindingExtension,
			{ content, elevator: factory },
		)
		const push = (value: string) =>
			engine.extensions.plain.push(new TTabsItem({ value, text: value.toUpperCase() }))

		return { engine, content, context, push }
	}

	/** Сторона панели в связке: роль, `id` и ссылка на таб. */
	const panelSide = (content: TTabsContent) => ({
		role: content.aria.get('role'),
		id: content.aria.get('id'),
		labelledBy: content.aria.get('aria-labelledby'),
	})

	it('таб из данных связывается уже в сборке: фасад и aria панели', () => {
		const { engine, content, context } = assemblePanel([{ value: 'a', text: 'A' }])
		const [tab] = engine.extensions.batch.items

		expect(context.instance.item).toBe(tab)
		expect(panelSide(content)).toEqual({
			role: 'tabpanel',
			id: tab.aria.get('aria-controls'),
			labelledBy: tab.aria.get('id'),
		})
	})

	it('до attach таб, вошедший после сборки, панель не находит', () => {
		const { content, context, push } = assemblePanel()

		push('a')

		expect(context.instance.item).toBeUndefined()
		expect(content.aria.has('role')).toBe(false)
	})

	it('attach находит таб, вошедший после сборки', () => {
		const { content, context, push } = assemblePanel()
		const tab = push('a')

		context.attach()

		expect(context.instance.item).toBe(tab)
		expect(panelSide(content)).toEqual({
			role: 'tabpanel',
			id: tab.aria.get('aria-controls'),
			labelledBy: tab.aria.get('id'),
		})
	})

	it('после attach панель следит за составом и своим value', () => {
		const { content, context, push } = assemblePanel()

		context.attach()

		const a = push('a')

		expect(context.instance.item).toBe(a)

		const b = push('b')

		content.value = 'b'

		expect(context.instance.item).toBe(b)
		expect(content.aria.get('aria-labelledby')).toBe(b.aria.get('id'))
	})

	it('destroy снимает подписки и aria панели', () => {
		const { content, context, push } = assemblePanel()

		push('a')
		context.attach()
		context.destroy()

		expect(content.aria.has('role')).toBe(false)

		// Подписки сняты: ни новый таб, ни смена value панель не связывают
		push('b')
		content.value = 'b'

		expect(content.aria.has('role')).toBe(false)
	})

	it('собранная, но не принятая панель при destroy снимает aria сборки', () => {
		const { content, context } = assemblePanel([{ value: 'a', text: 'A' }])

		expect(content.aria.get('role')).toBe('tabpanel')

		context.destroy()

		expect(content.aria.has('role')).toBe(false)
	})
})
