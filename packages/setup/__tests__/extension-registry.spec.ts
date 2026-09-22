/**
 * Реестр расширений коллекции: `useExtensions` ставит расширения в движок
 * каждого компонента типа.
 *
 * Здесь — правила сборки на готовом движке (`applyRegisteredExtensions`); что
 * setup зовёт его при привязке движка к компоненту, проверяет Vue
 * (`ui/vue/__tests__/external-plugin.spec.ts`).
 */

import { describe, it, expect, afterEach } from 'vitest'
import { TButton, TEvented, TTabs, TTags, createEngine } from '@soldy-ui/core'
import type { IExtension, IExtensionContext } from '@soldy-ui/core'
import { applyRegisteredExtensions, useExtensions } from '@soldy-ui/setup'

class TProbeExtension implements IExtension<object> {
	readonly name: string = 'probe'
	readonly events = new TEvented<Record<string, never>>()

	installed = 0
	owner: unknown = null

	constructor(owner?: unknown) {
		this.owner = owner ?? null
	}

	install(_ctx: IExtensionContext<object>): void {
		this.installed++
	}
}

/** Другое расширение под занятым именем. */
class TImpostorExtension extends TProbeExtension {}

const disposers: (() => void)[] = []

afterEach(() => {
	for (const dispose of disposers.splice(0)) dispose()
})

const engine = () => createEngine<object>({ items: [] })

describe('useExtensions', () => {
	it('ставит расширение владельцу типа, фабрика получает владельца', () => {
		const owner = new TTags()
		const target = engine()

		disposers.push(useExtensions(TTags, [(tags) => new TProbeExtension(tags)]))

		applyRegisteredExtensions(owner, target)

		const probe = target.extensions.probe

		expect(probe).toBeInstanceOf(TProbeExtension)
		expect(probe instanceof TProbeExtension && probe.owner).toBe(owner)
		expect(probe instanceof TProbeExtension && probe.installed).toBe(1)
	})

	it('владелец другого типа расширение не получает', () => {
		const target = engine()

		disposers.push(useExtensions(TTags, [() => new TProbeExtension()]))

		applyRegisteredExtensions(new TTabs(), target)

		expect(target.extensions.probe).toBeUndefined()
	})

	it("по умолчанию 'own': вложенный владелец пропускается, 'all' — нет", () => {
		const own = engine()
		const all = engine()

		disposers.push(useExtensions(TTags, [() => new TProbeExtension()]))
		applyRegisteredExtensions(new TTags(), own, { embedded: 'select.tags' })

		disposers.push(useExtensions(TTags, [() => new TProbeExtension()], { scope: 'all' }))
		applyRegisteredExtensions(new TTags(), all, { embedded: 'select.tags' })

		expect(own.extensions.probe).toBeUndefined()
		expect(all.extensions.probe).toBeInstanceOf(TProbeExtension)
	})

	it('тот же движок у двух компонентов получает расширение один раз', () => {
		const shared = engine()

		disposers.push(useExtensions(TTags, [() => new TProbeExtension()]))

		applyRegisteredExtensions(new TTags(), shared)
		const first = shared.extensions.probe
		applyRegisteredExtensions(new TTags(), shared)

		expect(shared.extensions.probe).toBe(first)
	})

	it('имя, занятое расширением другого класса, — ошибка', () => {
		const target = engine()

		disposers.push(useExtensions(TTags, [() => new TProbeExtension()]))
		disposers.push(useExtensions(TTags, [() => new TImpostorExtension()]))

		expect(() => applyRegisteredExtensions(new TTags(), target)).toThrow(
			/«probe» уже есть в коллекции TTags/,
		)
	})

	it('встроенное расширение заменить нельзя', () => {
		class TBatchImpostor extends TProbeExtension {
			override readonly name = 'batch'
		}

		disposers.push(useExtensions(TTags, [() => new TBatchImpostor()]))

		expect(() => applyRegisteredExtensions(new TTags(), engine())).toThrow(/«batch»/)
	})

	it('отмена регистрации: новые движки расширение не получают', () => {
		const dispose = useExtensions(TButton, [() => new TProbeExtension()])
		const target = engine()

		dispose()
		applyRegisteredExtensions(new TButton(), target)

		expect(target.extensions.probe).toBeUndefined()
	})
})
