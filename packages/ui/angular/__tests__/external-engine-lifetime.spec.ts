/**
 * Монтирование над движком и владельцем снаружи ничего не оставляет на их шинах.
 *
 * Движок и `ctrl`, переданные снаружи, живут дольше монтирования. Фасад
 * коллекции подписывается на расширения движка пробросом (`relayAll`), а
 * проброс держит источник, только пока цель слушают (`TEvented`): фасад уходит
 * с движка вместе со своими подписчиками — обменом адаптера. Здесь — настоящий
 * цикл Angular, как `ui/vue/__tests__/external-engine-lifetime.spec.ts` у Vue:
 * три монтирования ListBox подряд, и на шинах владельца, движка и его
 * расширений ни подписки, ни перехватчика, ни слушателя обмена.
 *
 * Список над движком без `ctrl`, перенесённый в компонент раньше по дереву,
 * Angular собирает раньше, чем снимает прежний: привязку владельца забирает
 * новое монтирование, хотя прежнее ещё держит движок.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { Component, input, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { TEvented, TListBox, createEngineListBox } from '@soldy-ui/core'
import type { TListBoxCollection } from '@soldy-ui/core'
import { TListBoxComponent } from '@soldy-ui/angular'

afterEach(() => {
	vi.restoreAllMocks()
})

const ITEMS = [
	{ value: 'a', text: 'Первый' },
	{ value: 'b', text: 'Второй' },
]

/**
 * Живые подписки шин: `on` без парного `off`, перехватчики `use` и слушатели
 * `listen`, которых не сняли.
 */
function watchBuses(buses: readonly TEvented<any>[]): () => string[] {
	const live = new Map<string, number>()
	const keys = new Map<unknown, Map<string, string>>()
	let next = 0
	const keyOf = (handler: unknown, event: string): string => {
		const byEvent = keys.get(handler) ?? new Map<string, string>()
		const key = byEvent.get(event) ?? `${event}#${next++}`

		byEvent.set(event, key)
		keys.set(handler, byEvent)

		return key
	}
	const count = (key: string, delta: number) => {
		const value = (live.get(key) ?? 0) + delta

		if (value > 0) live.set(key, value)
		else live.delete(key)
	}

	for (const bus of buses) {
		const on = bus.on.bind(bus)
		const off = bus.off.bind(bus)
		const use = bus.use.bind(bus)
		const listen = bus.listen.bind(bus)

		vi.spyOn(bus, 'on').mockImplementation((event, handler) => {
			count(keyOf(handler, String(event)), 1)
			on(event, handler)
		})
		vi.spyOn(bus, 'off').mockImplementation((event, handler) => {
			count(keyOf(handler, String(event)), -1)
			off(event, handler)
		})
		vi.spyOn(bus, 'use').mockImplementation((middleware) => {
			const key = `use#${next++}`
			const release = use(middleware)

			count(key, 1)

			return () => {
				count(key, -1)
				release()
			}
		})
		vi.spyOn(bus, 'listen').mockImplementation((listener) => {
			const key = `listen#${next++}`
			const release = listen(listener)

			count(key, 1)

			return () => {
				count(key, -1)
				release()
			}
		})
	}

	return () => [...live.keys()].map((key) => key.replace(/#\d+$/, ''))
}

describe('ListBox над движком и владельцем снаружи', () => {
	it('после нескольких монтирований на шинах владельца и движка ничего', () => {
		const owner = new TListBox()
		const engine = createEngineListBox({ owner, items: ITEMS })
		const extensions = Object.values(engine.extensions).flatMap((extension) =>
			extension ? [extension.events] : [],
		)
		const live = watchBuses([owner.events, engine.events, ...extensions])

		@Component({
			standalone: true,
			imports: [TListBoxComponent],
			template: `<so-list-box [ctrl]="owner" [engine]="engine"></so-list-box>`,
		})
		class ExternalHost {
			readonly owner = owner
			readonly engine = engine
		}

		for (let i = 0; i < 3; i++) {
			const fixture = TestBed.createComponent(ExternalHost)

			fixture.detectChanges()

			const host: HTMLElement = fixture.nativeElement

			// Смонтирован по-настоящему: элементы на месте
			expect(host.querySelectorAll('.so-list-box-item')).toHaveLength(ITEMS.length)

			fixture.destroy()
		}

		expect(live()).toEqual([])
	})
})

/** Владелец в опциях движка: без `ctrl` его собирает монтирование. */
function ownerOf(engine: TListBoxCollection): TListBox {
	const owner = engine.options.get('owner')

	if (!(owner instanceof TListBox)) throw new Error('владельца у движка нет')

	return owner
}

/**
 * Место списка — ветка `@if` в своём компоненте. Внутри одного шаблона Angular
 * снимает прежнюю ветку раньше, чем зовёт `ngOnInit` новой, а компоненты
 * проверяет по порядку дерева: место раньше по дереву собирает новый список
 * до того, как место после него снимает прежний.
 */
@Component({
	selector: 'probe-list-place',
	standalone: true,
	imports: [TListBoxComponent],
	template: `@if (shown()) {
		<so-list-box [engine]="engine()" [disabled]="disabled()"></so-list-box>
	}`,
})
class ProbeListPlace {
	readonly shown = input.required<boolean>()
	readonly engine = input.required<TListBoxCollection>()
	readonly disabled = input(false)
}

/**
 * Без `ctrl` каждое монтирование собирает своего владельца, а движок снаружи
 * тот же. Привязку забирает новое монтирование, а снятие прежнего её не
 * трогает.
 */
describe('ListBox над движком снаружи без ctrl, перенесённый за одну проверку', () => {
	it('перенос в компонент раньше по дереву: движок у владельца нового монтирования, после снятия на шинах ничего', () => {
		const engine = createEngineListBox({ items: ITEMS })
		const extensions = Object.values(engine.extensions).flatMap((extension) =>
			extension ? [extension.events] : [],
		)
		const live = watchBuses([engine.events, ...extensions])

		@Component({
			selector: 'probe-list-move',
			standalone: true,
			imports: [ProbeListPlace],
			template: `
				<probe-list-place
					class="so-test-second"
					[shown]="swapped()"
					[engine]="engine"
					[disabled]="disabled()"
				/>
				<probe-list-place
					class="so-test-first"
					[shown]="!swapped()"
					[engine]="engine"
					[disabled]="disabled()"
				/>
			`,
		})
		class MoveHost {
			readonly engine = engine
			readonly swapped = signal(false)
			readonly disabled = signal(false)
		}

		const fixture = TestBed.createComponent(MoveHost)
		const host: HTMLElement = fixture.nativeElement
		const itemsDisabled = () =>
			[...host.querySelectorAll('.so-list-box-item')].map((item) =>
				item.getAttribute('data-disabled'),
			)

		fixture.detectChanges()

		const first = ownerOf(engine)

		fixture.componentInstance.swapped.set(true)
		fixture.detectChanges()

		// Перенесён: элементы одного списка, движок — у нового владельца
		expect(host.querySelectorAll('.so-test-first .so-list-box-item')).toHaveLength(0)
		expect(host.querySelectorAll('.so-test-second .so-list-box-item')).toHaveLength(
			ITEMS.length,
		)
		expect(ownerOf(engine)).not.toBe(first)

		// Прежний владелец отпущен: его `disabled` до элементов не доходит
		first.disabled = true
		fixture.detectChanges()

		expect(itemsDisabled()).not.toContain('true')

		// Подписки на нового живы: его `disabled` доходит до элементов
		fixture.componentInstance.disabled.set(true)
		fixture.detectChanges()

		expect(itemsDisabled()).toEqual(['true', 'true'])

		fixture.destroy()

		expect(engine.options.get('owner')).toBeUndefined()
		expect(live()).toEqual([])
	})
})
