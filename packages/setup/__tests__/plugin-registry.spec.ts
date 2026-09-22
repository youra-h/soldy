// @vitest-environment jsdom

/**
 * Реестр плагинов: `usePlugins` ставит плагины всем компонентам типа.
 *
 * Проверяется на уровне setup — там, где набор собирается для любого адаптера.
 * Признак вложенности (`embedded`) здесь передаётся в контекст напрямую; как
 * его ставит разметка библиотеки, проверяют адаптеры.
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TButton, TSwitch } from '@soldy-ui/core'
import { TBasePlugin, TElementPlugin, TPluginBundle } from '@soldy-ui/plugins'
import type { IPluginContext } from '@soldy-ui/plugins'
import {
	ButtonDescriptor,
	ComponentDescriptor,
	SwitchDescriptor,
	createAdapterContext,
	usePlugins,
} from '@soldy-ui/setup'

/** Плагин снаружи: запоминает опции установки и объявление. */
class TProbePlugin extends TBasePlugin {
	options: unknown = undefined
	createdCount = 0

	override install(ctx: IPluginContext, options?: unknown): void {
		super.install(ctx, options)
		this.options = options
	}

	override created(): void {
		super.created()
		this.createdCount++
	}
}

class TOtherPlugin extends TBasePlugin {}

/** Регистрации теста: реестр глобальный, каждая снимается после теста. */
const disposers: (() => void)[] = []

const register = (...args: Parameters<typeof usePlugins>) => {
	disposers.push(usePlugins(...args))
}

afterEach(() => {
	for (const dispose of disposers.splice(0)) dispose()
})

/** `bundle:create` и объявление плагинов отложены на микрозадачу. */
const created = () => Promise.resolve()

const button = (options: { ctrl?: TButton; embedded?: string } = {}) =>
	createAdapterContext(ButtonDescriptor(), options)

describe('usePlugins · тип компонента', () => {
	it('компонент типа получает плагин после своих, и тот объявляется вместе с ними', async () => {
		register(TButton, [TProbePlugin])

		const context = button()
		const probe = context.bundle?.get(TProbePlugin)

		await created()

		expect(probe).toBeInstanceOf(TProbePlugin)
		expect(probe?.createdCount).toBe(1)
		expect(context.bundle?.get(TElementPlugin)).toBeInstanceOf(TElementPlugin)
	})

	it('компонент другого типа плагин не получает', () => {
		register(TButton, [TProbePlugin])

		const context = createAdapterContext(SwitchDescriptor(), {})

		expect(context.instance).toBeInstanceOf(TSwitch)
		expect(context.bundle?.get(TProbePlugin)).toBeUndefined()
	})

	it('наследник типа, переданный через ctrl, плагин получает', () => {
		class TCustomButton extends TButton {}

		register(TButton, [TProbePlugin])

		expect(button({ ctrl: new TCustomButton() }).bundle?.get(TProbePlugin)).toBeInstanceOf(
			TProbePlugin,
		)
	})

	it('плагин реестра виден в bundle:create', async () => {
		const ctrl = new TButton()
		const seen: unknown[] = []

		register(TButton, [TProbePlugin])

		ctrl.events.on('bundle:create', (bundle: unknown) => {
			if (bundle instanceof TPluginBundle) seen.push(bundle.get(TProbePlugin))
		})

		button({ ctrl })
		await created()

		expect(seen).toHaveLength(1)
		expect(seen[0]).toBeInstanceOf(TProbePlugin)
	})

	it('компоненту без своих плагинов реестр набора не создаёт', () => {
		register(Object, [TProbePlugin], { scope: 'all' })

		expect(createAdapterContext(ComponentDescriptor(), {}).bundle).toBeNull()
	})
})

describe('usePlugins · scope', () => {
	it("по умолчанию 'own': вложенный компонент плагин не получает", () => {
		register(TButton, [TProbePlugin])

		expect(button().bundle?.get(TProbePlugin)).toBeInstanceOf(TProbePlugin)
		expect(button({ embedded: 'tags.close' }).bundle?.get(TProbePlugin)).toBeUndefined()
	})

	it("'all': получает и вложенный", () => {
		register(TButton, [TProbePlugin], { scope: 'all' })

		expect(button().bundle?.get(TProbePlugin)).toBeInstanceOf(TProbePlugin)
		expect(button({ embedded: 'tags.close' }).bundle?.get(TProbePlugin)).toBeInstanceOf(
			TProbePlugin,
		)
	})
})

describe('usePlugins · состав и опции', () => {
	it('опции регистрации уходят в install', () => {
		const options = { interval: 1000 }

		register(TButton, [{ ctor: TProbePlugin, options }])

		expect(button().bundle?.get(TProbePlugin)?.options).toBe(options)
	})

	it('повторная регистрация плагина: один экземпляр, опции последней', () => {
		const theme = { from: 'theme' }
		const app = { from: 'app' }

		register(TButton, [{ ctor: TProbePlugin, options: theme }, TOtherPlugin], { scope: 'all' })
		register(TButton, [{ ctor: TProbePlugin, options: app }])

		const bundle = button().bundle

		expect(bundle?.get(TProbePlugin)?.options).toBe(app)
		expect(bundle?.get(TOtherPlugin)).toBeInstanceOf(TOtherPlugin)
	})

	it('плагин из состава компонента заменить нельзя', () => {
		register(TButton, [TElementPlugin])

		expect(() => button()).toThrow(/TElementPlugin уже входит в состав TButton/)
	})

	it('отмена регистрации: новые компоненты плагин не получают, собранные сохраняют', () => {
		const dispose = usePlugins(TButton, [TProbePlugin])
		const before = button()

		dispose()

		expect(before.bundle?.get(TProbePlugin)).toBeInstanceOf(TProbePlugin)
		expect(button().bundle?.get(TProbePlugin)).toBeUndefined()
	})
})
