import { describe, it, expect, vi } from 'vitest'
import { createEngine } from '@soldy/core'
import type { TCollectionEngine } from '@soldy/core'
import { TPluginBundle, TDragPlugin } from '@soldy/plugins'
import {
	createAdapterContext,
	defineComponent,
	ButtonDescriptor,
	DragAndDropDescriptor,
	TElevator,
	TPluginsBindingExtension,
	TCollectionExtension,
	TDragAndDropExtension,
	TDragAndDropCollectionExtension,
	COLLECTION_ENGINE_ELEVATOR,
	ITEM_CONTEXT_ELEVATOR,
	DRAG_CONTEXT_ELEVATOR,
	type IElevatorKey,
	type TElevatorFactory,
	type IAdapterContext,
} from '@soldy/setup'
import { required } from './helpers'

/** Простая in-memory реализация фабрики элеваторов для тестов. */
function createElevatorFactory() {
	const store = new Map<IElevatorKey<unknown>, unknown>()

	// Как `inject<T>` во фреймворках: тип значения задаёт ключ, хранилищу он неизвестен
	const factory: TElevatorFactory = <T>(key: IElevatorKey<T>) => ({
		down: (value: T) => {
			store.set(key, value)
		},
		up: () => store.get(key) as T | undefined,
	})

	return { factory, store }
}

/** Фасад-заглушка: у инстанса есть движок — всё, что нужно коллекционным расширениям. */
class TEngineOwner {
	constructor(readonly engine: TCollectionEngine<any, any>) {}
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

		const ctx = createAdapterContext(
			defineComponent({ ctor: Simple }),
			{},
			{ defaultExtensions: [] },
		)

		expect(ctx.instance).toBeInstanceOf(Simple)
	})

	it('использует готовый ctrl без вызова конструктора', () => {
		class Simple {}
		const ctrl = new Simple()

		const ctx = createAdapterContext(
			defineComponent({ ctor: Simple }),
			{ ctrl },
			{ defaultExtensions: [] },
		)

		expect(ctx.instance).toBe(ctrl)
	})

	it('передаёт props в конструктор и хранит accessor/descriptor', () => {
		class WithProps {
			text: string
			constructor(props: { text?: string }) {
				this.text = props.text ?? ''
			}
		}

		const descriptor = defineComponent({ ctor: WithProps })
		const ctx = createAdapterContext(
			descriptor,
			{ props: { text: 'hi' } },
			{ defaultExtensions: [] },
		)

		expect(ctx.instance.text).toBe('hi')
		expect(ctx.descriptor).toBe(descriptor)
		expect(ctx.accessor).toBeDefined()
	})

	it('применяет TPluginsBindingExtension по умолчанию при наличии ElementPlugin', () => {
		const ctx = createAdapterContext(ButtonDescriptor(), {})

		expect(ctx.get(TPluginsBindingExtension)).toBeInstanceOf(TPluginsBindingExtension)
	})

	it('не подключает TPluginsBindingExtension, если нет TElementPlugin', () => {
		// DragAndDrop наследует ComponentDescriptor (headless), плагина элемента нет.
		// Расширение требует его и бросило бы исключение — поэтому не подключается.
		const ctx = createAdapterContext(DragAndDropDescriptor(), {})

		expect(ctx.get(TPluginsBindingExtension)).toBeUndefined()
	})

	it('позволяет переопределить стартовый набор расширений', () => {
		const ctx = createAdapterContext(ButtonDescriptor(), {}, { defaultExtensions: [] })

		expect(ctx.get(TPluginsBindingExtension)).toBeUndefined()
	})

	it('регистрирует и возвращает расширения через use/get', () => {
		class MyExt {
			constructor(
				public readonly context: IAdapterContext,
				public readonly opts?: { x: number },
			) {}
		}

		const ctx = createAdapterContext(
			defineComponent({ ctor: class {} }),
			{},
			{ defaultExtensions: [] },
		)

		ctx.use(MyExt, { x: 1 })

		expect(ctx.get(MyExt)).toBeInstanceOf(MyExt)
		expect(ctx.get(MyExt)!.opts).toEqual({ x: 1 })
	})

	it('destroy эмитит событие и очищает расширения', () => {
		class MyExt {
			constructor(public readonly context: IAdapterContext) {}
		}

		const ctx = createAdapterContext(
			defineComponent({ ctor: class {} }),
			{},
			{ defaultExtensions: [] },
		)

		let destroyed = false
		ctx.events.on('destroy', () => {
			destroyed = true
		})

		ctx.use(MyExt)
		ctx.destroy()

		expect(destroyed).toBe(true)
		expect(ctx.get(MyExt)).toBeUndefined()
	})
})

describe('расширения коллекций', () => {
	it('TCollectionExtension опускает engine и регистрирует item через elevator', () => {
		const { factory, store } = createElevatorFactory()

		const engine = createEngine()
		const push = vi.spyOn(engine.extensions.plain, 'push')
		const remove = vi.spyOn(engine.extensions.plain, 'remove')

		const ctx = createAdapterContext(
			defineComponent({ ctor: TEngineOwner }),
			{ ctrl: new TEngineOwner(engine) },
			{ defaultExtensions: [] },
		)

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

		const ctx = createAdapterContext(
			defineComponent({ ctor: TEngineOwner }),
			{ ctrl: new TEngineOwner(engine) },
			{ defaultExtensions: [] },
		)

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

		const ctx = createAdapterContext(
			defineComponent({ ctor: TEngineOwner }),
			{ ctrl: new TEngineOwner(engine) },
			{ defaultExtensions: [] },
		)

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

		const ctx = createAdapterContext(
			defineComponent({ ctor: class {} }),
			{},
			{ defaultExtensions: [] },
		)

		// Компилятор такое подключение не пропускает; проверка в рантайме — для
		// потребителя без типов.
		// @ts-expect-error — у инстанса нет engine
		expect(() => ctx.use(TCollectionExtension, { elevator: factory })).toThrow(
			'Engine is not available in the engine instance.',
		)
	})

	it('TDragAndDropExtension опускает флаг drag-контекста вниз', () => {
		const { factory, store } = createElevatorFactory()

		const ctx = createAdapterContext(
			defineComponent({ ctor: class {} }),
			{},
			{ defaultExtensions: [] },
		)

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
			{ bundle, defaultExtensions: [] },
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
			{ bundle, defaultExtensions: [] },
		)

		const activateSpy = vi.spyOn(TDragPlugin.prototype, 'activate')

		ctx.use(TDragAndDropCollectionExtension, { elevator: factory })

		expect(activateSpy).not.toHaveBeenCalled()

		activateSpy.mockRestore()
	})
})
