/**
 * `TBasePlugin` — события жизненного цикла, которые база шлёт любому плагину,
 * и подписка на чужую шину (`_listenTo`): её начинает принятие набора
 * (`attach()`), а снимает `destroy()`.
 *
 * Сверяется весь список вызовов вместе с аргументами, а не сам факт вызова:
 * лишний или пропавший аргумент — уже другой контракт. `destroy()` зовётся без
 * контекста, поэтому и событие приходит без аргументов: заглушка на месте
 * контекста отдала бы подписчику объект, которого у плагина нет.
 *
 * Шина владельца переживает плагин, когда приложение передаёт свой `ctrl`:
 * новое монтирование ставит ему новый набор, а старый уничтожается. Поэтому
 * здесь владелец живёт дольше плагина, и его событие приходит и после
 * `destroy()`.
 */

import { describe, it, expect, expectTypeOf, vi } from 'vitest'
import { TEvented } from '@soldy-ui/core'
import { TBasePlugin, TPluginBundle } from '../src'
import type { IListenable, IPluginContext, TPluginEvents } from '../src'

/** Лист без собственных событий: проверяется только то, что шлёт база. */
class TProbePlugin extends TBasePlugin {}

function context(): IPluginContext {
	return {
		get: () => undefined,
		getInstance: () => null,
		createId: (part) => part,
	}
}

type TOwnerEvents = {
	ping: (value: number) => void
	pong: () => void
}

/** Владелец с шиной — как инстанс ядра, которым управляет приложение. */
class TOwner {
	readonly events = new TEvented<TOwnerEvents>()
}

/** Подписан на владельца методом базы и помнит, что пришло. */
class TPingPlugin extends TBasePlugin {
	readonly received: number[] = []

	override install(ctx: IPluginContext, options?: unknown): void {
		super.install(ctx, options)

		const owner = ctx.getInstance<TOwner>()

		this._listenTo(owner?.events, 'ping', (value) => this.received.push(value))
		this._listenTo(owner?.events, 'pong', () => this.received.push(0))
	}
}

/**
 * Владелец по контракту, а не по классу: плагину нужна только часть его шины.
 * Так `TListHeightPlugin` знает ListBox и Select.
 */
interface IPingOwner {
	readonly events: IListenable<Pick<TOwnerEvents, 'ping'>>
}

class TContractPingPlugin extends TBasePlugin {
	readonly received: number[] = []

	override install(ctx: IPluginContext, options?: unknown): void {
		super.install(ctx, options)

		this._listenTo(ctx.getInstance<IPingOwner>()?.events, 'ping', (value) =>
			this.received.push(value),
		)
	}
}

/**
 * Плагин из набора над владельцем и шпионы на шине владельца — до установки.
 * Набор собран, но не принят.
 */
function assemble<P extends TBasePlugin>(Plugin: new () => P) {
	const owner = new TOwner()
	const on = vi.spyOn(owner.events, 'on')
	const off = vi.spyOn(owner.events, 'off')
	const bundle = new TPluginBundle(owner).use(Plugin)
	const plugin = bundle.get(Plugin)

	if (!plugin) throw new Error(`${Plugin.name} не встал в набор`)

	return { owner, on, off, bundle, plugin }
}

/** Собранный и принятый набор: подписки на чужие шины подключены. */
function mount<P extends TBasePlugin>(Plugin: new () => P) {
	const mounted = assemble(Plugin)

	mounted.bundle.attach()

	return mounted
}

describe('TBasePlugin — события жизненного цикла', () => {
	it('install приходит с контекстом и опциями', () => {
		const plugin = new TProbePlugin()
		const ctx = context()
		const options = { placement: 'top' }
		const onInstall = vi.fn<TPluginEvents['install']>()

		plugin.events.on('install', onInstall)
		plugin.install(ctx, options)

		expect(onInstall.mock.calls).toStrictEqual([[ctx, options]])
		expect(onInstall.mock.calls[0][0]).toBe(ctx)
		expect(onInstall.mock.calls[0][1]).toBe(options)
	})

	it('create приходит с самим плагином', () => {
		const plugin = new TProbePlugin()
		const onCreate = vi.fn<TPluginEvents['create']>()

		plugin.events.on('create', onCreate)
		plugin.created()

		expect(onCreate.mock.calls).toStrictEqual([[plugin]])
		expect(onCreate.mock.calls[0][0]).toBe(plugin)
	})

	it('destroy приходит без аргументов', () => {
		const plugin = new TProbePlugin()
		const onDestroy = vi.fn<TPluginEvents['destroy']>()

		plugin.events.on('destroy', onDestroy)
		plugin.destroy()

		expect(onDestroy.mock.calls).toStrictEqual([[]])
	})

	it('attach приходит без аргументов и один раз', () => {
		const plugin = new TProbePlugin()
		const onAttach = vi.fn<TPluginEvents['attach']>()

		plugin.events.on('attach', onAttach)
		plugin.install(context())
		plugin.attach()
		plugin.attach()

		expect(onAttach.mock.calls).toStrictEqual([[]])
	})
})

/**
 * Сборку набора фреймворк может и не принять: её отбрасывают до показа, и
 * `destroy()` у неё не будет. Поэтому подписка на чужую шину начинается с
 * принятия (`attach()`), а до него только запоминается.
 */
describe('TBasePlugin — подписка на чужую шину начинается с принятия', () => {
	it('до принятия на шине ничего нет, и событие владельца не доходит', () => {
		const { owner, on, plugin } = assemble(TPingPlugin)

		owner.events.emit('ping', 1)

		expect(on).not.toHaveBeenCalled()
		expect(plugin.received).toEqual([])
	})

	it('принятие подключает подписки в порядке вызовов', () => {
		const { owner, on, bundle, plugin } = assemble(TPingPlugin)

		bundle.attach()
		owner.events.emit('ping', 1)

		expect(on.mock.calls.map(([event]) => event)).toEqual(['ping', 'pong'])
		expect(plugin.received).toEqual([1])
	})

	it('после принятия подписка ставится сразу', () => {
		class TLatePlugin extends TBasePlugin {
			readonly received: number[] = []

			listen(owner: TOwner): void {
				this._listenTo(owner.events, 'ping', (value) => this.received.push(value))
			}
		}

		const { owner, bundle } = assemble(TLatePlugin)
		const late = bundle.get(TLatePlugin)

		bundle.attach()
		late?.listen(owner)
		owner.events.emit('ping', 1)

		expect(late?.received).toEqual([1])
	})

	it('плагин, уничтоженный до принятия, не подписывается', () => {
		const { owner, on, plugin } = assemble(TPingPlugin)

		plugin.destroy()
		plugin.attach()
		owner.events.emit('ping', 1)

		expect(on).not.toHaveBeenCalled()
		expect(plugin.received).toEqual([])
	})

	it('плагин, поставленный в принятый набор, принимается сразу', () => {
		const owner = new TOwner()
		const bundle = new TPluginBundle(owner)

		bundle.attach()
		bundle.use(TPingPlugin)
		owner.events.emit('ping', 1)

		expect(bundle.get(TPingPlugin)?.received).toEqual([1])
	})
})

describe('TBasePlugin — подписка на шину, которая живёт дольше плагина', () => {
	it('до destroy событие владельца доходит, после — нет', () => {
		const { owner, bundle, plugin } = mount(TPingPlugin)

		owner.events.emit('ping', 1)
		bundle.destroy()
		owner.events.emit('ping', 2)
		owner.events.emit('pong')

		expect(plugin.received).toEqual([1])
	})

	it('destroy снимает с шины ровно то, что подписал', () => {
		const { on, off, bundle } = mount(TPingPlugin)
		const subscribed = [...on.mock.calls]

		bundle.destroy()

		expect(subscribed.map(([event]) => event)).toEqual(['ping', 'pong'])
		expect(off.mock.calls).toEqual(subscribed)
	})

	it('повторный destroy отписку не повторяет', () => {
		const { off, plugin } = mount(TPingPlugin)

		plugin.destroy()
		plugin.destroy()

		expect(off).toHaveBeenCalledTimes(2)
	})

	it('шины нет — подписываться не на что', () => {
		const plugin = new TPingPlugin()

		plugin.install(context())

		expect(() => plugin.destroy()).not.toThrow()
		expect(plugin.received).toEqual([])
	})

	it('шина по контракту снимается так же, как TEvented', () => {
		const { owner, on, off, bundle, plugin } = mount(TContractPingPlugin)
		const subscribed = [...on.mock.calls]

		owner.events.emit('ping', 1)
		bundle.destroy()
		owner.events.emit('ping', 2)

		expect(plugin.received).toEqual([1])
		expect(subscribed).toHaveLength(1)
		expect(off.mock.calls).toEqual(subscribed)
	})

	// Негативные случаи ловит не vitest, а «Типы — Plugins»: tsc проверяет и
	// __tests__, а неиспользованный @ts-expect-error — тоже ошибка
	it('имя события и обработчик сверяются по карте шины', () => {
		class TTypedPlugin extends TBasePlugin {
			check(owner: TOwner, contract: IPingOwner): void {
				// @ts-expect-error — события `missing` в карте владельца нет
				this._listenTo(owner.events, 'missing', () => {})
				// @ts-expect-error — `ping` приходит с числом, а не со строкой
				this._listenTo(owner.events, 'ping', (value: string) => void value)
				// @ts-expect-error — `pong` в контракте владельца не объявлен
				this._listenTo(contract.events, 'pong', () => {})

				this._listenTo(owner.events, 'ping', (value) => {
					expectTypeOf(value).toEqualTypeOf<number>()
				})
			}
		}

		const owner = new TOwner()
		const plugin = new TTypedPlugin()

		plugin.check(owner, owner)
		plugin.destroy()
	})
})
