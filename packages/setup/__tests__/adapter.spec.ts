import { describe, it, expect, vi } from 'vitest'
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
	type TElevatorFactory,
	type IAdapterContext,
} from '@soldy/setup'

/** Простая in-memory реализация фабрики элеваторов для тестов. */
function createElevatorFactory() {
	const store = new Map<string | symbol, unknown>()

	const factory: TElevatorFactory = <T>(key: string | symbol) => ({
		down: (value: T) => {
			store.set(key, value)
		},
		up: () => store.get(key) as T | undefined,
	})

	return { factory, store }
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

	it('бросает ошибку, если бандл не содержит TElementPlugin', () => {
		expect(() => createAdapterContext(DragAndDropDescriptor(), {})).toThrow(
			'TElementPlugin is not available in the context bundle.',
		)
	})

	it('позволяет переопределить стартовый набор расширений', () => {
		const ctx = createAdapterContext(DragAndDropDescriptor(), {}, { defaultExtensions: [] })

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

		const engine = {
			extensions: {
				plain: {
					push: vi.fn(),
					remove: vi.fn(),
				},
			},
		}

		const ctx = createAdapterContext(
			defineComponent({ ctor: class {} }),
			{ ctrl: { engine } },
			{ defaultExtensions: [] },
		)

		ctx.use(TCollectionExtension, { elevator: factory })

		expect(store.get(ITEM_CONTEXT_ELEVATOR)).toBe(engine)

		const register = store.get(COLLECTION_ENGINE_ELEVATOR)
		expect(typeof register).toBe('function')

		const item = { uid: 'a' }
		const cleanup = register(item, {})

		expect(engine.extensions.plain.push).toHaveBeenCalledWith(item)

		cleanup()
		expect(engine.extensions.plain.remove).toHaveBeenCalledWith(item)
	})

	it('TCollectionExtension бросает ошибку без engine у instance', () => {
		const { factory } = createElevatorFactory()

		const ctx = createAdapterContext(
			defineComponent({ ctor: class {} }),
			{ ctrl: {} },
			{ defaultExtensions: [] },
		)

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

		const engine = {}
		const instance = { engine }

		const bundle = new TPluginBundle(instance)
		bundle.use(TDragPlugin)

		const ctx = createAdapterContext(
			defineComponent({ ctor: class {} }),
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

		const instance = { engine: {} }

		const bundle = new TPluginBundle(instance)
		bundle.use(TDragPlugin)

		const ctx = createAdapterContext(
			defineComponent({ ctor: class {} }),
			{ ctrl: instance },
			{ bundle, defaultExtensions: [] },
		)

		const activateSpy = vi.spyOn(TDragPlugin.prototype, 'activate')

		ctx.use(TDragAndDropCollectionExtension, { elevator: factory })

		expect(activateSpy).not.toHaveBeenCalled()

		activateSpy.mockRestore()
	})
})
