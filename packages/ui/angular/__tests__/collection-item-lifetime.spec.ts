/**
 * Элемент коллекции отпускает свой контекст при снятии.
 *
 * Фильтр прячет элемент из данных — компонент элемента снимается (`@for`
 * владельца), а сам элемент остаётся в коллекции; фильтр сняли — элемент
 * собирается снова. Контекст элемента (`TItemContext`) живёт ровно одно
 * монтирование: его item-адаптеры подписаны на расширения движка, и контекст,
 * который снятие не отпустило, копил бы на движке подписчиков с каждым
 * показом. Сторож по всем коллекциям — `setup/__tests__/item-context-lifetime.spec.ts`,
 * здесь — настоящий цикл Angular, как у Vue, React и Svelte.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { Component, type Type } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { TEvented, TListBox, createEngine, createEngineListBox } from '@soldy-ui/core'
import type { TCollectionEngine } from '@soldy-ui/core'
import {
	TAccordionComponent,
	TListBoxComponent,
	TRadioGroupComponent,
	TTabsComponent,
} from '@soldy-ui/angular'

afterEach(() => {
	vi.restoreAllMocks()
})

type TItem = { value: string; text: string }

const ITEMS: TItem[] = [
	{ value: 'a', text: 'Первый' },
	{ value: 'b', text: 'Второй' },
]

/**
 * Живые подписки шин движка — драйвера и каждого расширения: повешенные после
 * начала слежки и не снятые.
 */
function watchSubscriptions(engine: TCollectionEngine<any, any>): () => number {
	const extensions: Readonly<Record<string, { events?: unknown }>> = engine.extensions
	const spies = [
		engine.getCore().driver.events,
		...Object.values(extensions).map((e) => e.events),
	]
		.filter((bus) => bus instanceof TEvented)
		.map((bus) => ({ on: vi.spyOn(bus, 'on'), off: vi.spyOn(bus, 'off') }))

	return () =>
		spies.reduce(
			(live, { on, off }) =>
				live +
				on.mock.calls.filter(
					([event, handler]) =>
						!off.mock.calls.some(([e, h]) => e === event && h === handler),
				).length,
			0,
		)
}

/** Движок, который хост отдаёт коллекции; его задаёт тест до монтирования. */
let engine: TCollectionEngine<any, any> = createEngine()

/**
 * Селектор у хостов ListBox и Tabs свой: их разметка различается только
 * тегом, а тег в id компонента Angular не входит — без селектора id совпал бы
 * (предупреждение NG0912).
 */
@Component({
	selector: 'probe-list-box',
	standalone: true,
	imports: [TListBoxComponent],
	template: `<div so-list-box [engine]="engine"></div>`,
})
class ListBoxHost {
	readonly engine = engine
}

@Component({
	selector: 'probe-tabs',
	standalone: true,
	imports: [TTabsComponent],
	template: `<div so-tabs [engine]="engine"></div>`,
})
class TabsHost {
	readonly engine = engine
}

@Component({
	standalone: true,
	imports: [TAccordionComponent],
	template: `<div so-accordion [engine]="engine"></div>`,
})
class AccordionHost {
	readonly engine = engine
}

@Component({
	standalone: true,
	imports: [TRadioGroupComponent],
	template: `<div so-radio-group [engine]="engine"></div>`,
})
class RadioGroupHost {
	readonly engine = engine
}

/** Коллекции адаптера: все берут движок снаружи входом `engine`. */
const COLLECTIONS: ReadonlyArray<readonly [string, Type<unknown>]> = [
	['ListBox', ListBoxHost],
	['Tabs', TabsHost],
	['Accordion', AccordionHost],
	['RadioGroup', RadioGroupHost],
]

describe.each(COLLECTIONS)('%s: фильтр прячет и показывает элемент', (_name, host) => {
	it('подписок на движке не прибавляется с каждым показом', () => {
		const items = createEngine<TItem>({ items: ITEMS })
		const { driver } = items.getCore()
		let hidden = false

		// Отбор без расширения фильтра — тот же механизм, что у `TFilterExtension`
		driver.events.on('items:query:before', (e) => {
			if (hidden) e.items = e.items.filter((item) => item.value !== 'b')
		})

		engine = items

		const fixture = TestBed.createComponent(host)

		fixture.detectChanges()

		const live = watchSubscriptions(items)

		const cycle = () => {
			hidden = true
			driver.invalidateQuery()
			fixture.detectChanges()

			hidden = false
			driver.invalidateQuery()
			fixture.detectChanges()
		}

		cycle()

		const afterFirst = live()

		cycle()
		cycle()

		expect(items.extensions.batch.items).toHaveLength(2)
		expect(live()).toBe(afterFirst)
	})
})

describe('движок снаружи', () => {
	it('после снятия списка подписок на движке не остаётся', () => {
		const owner = new TListBox()
		const external = createEngineListBox({ owner, items: ITEMS })
		const live = watchSubscriptions(external)

		@Component({
			standalone: true,
			imports: [TListBoxComponent],
			template: `<div so-list-box [ctrl]="owner" [engine]="engine"></div>`,
		})
		class ExternalHost {
			readonly owner = owner
			readonly engine = external
		}

		const fixture = TestBed.createComponent(ExternalHost)

		fixture.detectChanges()
		fixture.destroy()

		expect(live()).toBe(0)
	})
})
