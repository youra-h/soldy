/**
 * Tooltip под Angular — проводка целиком, на настоящей разметке.
 *
 * Правила показа — задержки, причины, нажатие, Escape, одна подсказка на
 * документ — проверяет плагин (`plugins/__tests__/tooltip-trigger.plugin.spec.ts`),
 * эвристику фокуса и курсор через зазор — браузер
 * (`playground/vue/browser/tooltip.spec.ts`). Здесь важно, что они сходятся:
 * панель телепортирована и помечена владельцем, триггер получает ссылку на
 * неё через scope, `open` доходит до разметки в обе стороны, а Escape у
 * подсказки в открытом поповере закрывает только её. Сценарии — те же, что у
 * Vue (`ui/vue/__tests__/tooltip.spec.ts`); открытость, которую у Vue слышит
 * `v-model`, потребитель Angular слышит выходом `(soChangeOpen)`.
 *
 * Своё у Angular — разметка. Корень — элемент потребителя (`<span
 * so-tooltip>`), триггер — шаблон слота, и ссылку на панель на свой элемент
 * потребитель кладёт `[so-attributes]`; вывод шаблона меняет контекст в том же
 * представлении, и триггер — тот же узел при показе и смене `type`. Якорь
 * панели — корень (`rootElement()` базы), а `rendered: false` подсказка
 * передаёт и панели: корень Angular только прячется.
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { Component, signal, type Type } from '@angular/core'
import { TestBed, type ComponentFixture } from '@angular/core/testing'
import { TTooltip, type TTooltipPlacement, type TTooltipType } from '@soldy-ui/core'
import {
	AttributesDirective,
	SlotDirective,
	TButtonComponent,
	TPopoverComponent,
	TTooltipComponent,
} from '@soldy-ui/angular'
import { find, nextFrame } from './mount'

/**
 * Подсказка у кнопки. Задержки сняты: их отсчёт проверяет плагин, здесь — что
 * показ и скрытие доходят до разметки. Значения, которые тест меняет, —
 * сигналы: хост `OnPush`. Экземпляр ядра у подсказки внешний — тест пишет в
 * него открытость и режим.
 */
@Component({
	selector: 'probe-tooltip-page',
	standalone: true,
	imports: [TTooltipComponent, TButtonComponent, SlotDirective, AttributesDirective],
	template: `<span
		so-tooltip
		[ctrl]="ctrl"
		[openDelay]="0"
		[closeDelay]="0"
		[open]="open()"
		[type]="type()"
		[placement]="placement()"
		[rendered]="rendered()"
		(soChangeOpen)="changes.push($event)"
	>
		<ng-template slot="trigger" let-triggerAria="triggerAria">
			<button
				so-button
				text="Сохранить"
				class="so-test-trigger"
				[so-attributes]="triggerAria"
			></button>
		</ng-template>
		Сохранить черновик
	</span>`,
})
class Page {
	readonly ctrl = new TTooltip()
	readonly open = signal<boolean | undefined>(undefined)
	readonly type = signal<TTooltipType | undefined>(undefined)
	readonly placement = signal<TTooltipPlacement | undefined>(undefined)
	readonly rendered = signal<boolean | undefined>(undefined)
	/** Открытость, которую подсказка сообщила выходом. */
	readonly changes: boolean[] = []
}

/** Поповер без крестика, в панели которого — кнопка с подсказкой. */
@Component({
	selector: 'probe-tooltip-in-popover',
	standalone: true,
	imports: [
		TPopoverComponent,
		TTooltipComponent,
		TButtonComponent,
		SlotDirective,
		AttributesDirective,
	],
	template: `<div>
		<span so-popover [closable]="false">
			<ng-template
				slot="trigger"
				let-triggerAria="triggerAria"
				let-triggerDataset="triggerDataset"
			>
				<button
					so-button
					text="Открыть"
					class="so-test-popover-trigger"
					[so-attributes]="{ ...triggerAria, ...triggerDataset }"
				></button>
			</ng-template>
			<span so-tooltip [openDelay]="0" [closeDelay]="0">
				<ng-template slot="trigger" let-triggerAria="triggerAria">
					<button
						so-button
						text="Сохранить"
						class="so-test-trigger"
						[so-attributes]="triggerAria"
					></button>
				</ng-template>
				Сохранить черновик
			</span>
		</span>
	</div>`,
})
class PopoverPage {}

/** Смонтированный хост теста — его перепроверяют действия. */
let current: ComponentFixture<unknown> | null = null

afterEach(() => {
	current = null
	vi.restoreAllMocks()
})

/**
 * Смонтировать хост в документ и дождаться кадра: корень плагины получают
 * через `requestAnimationFrame`. `prepare` задаёт входы до первой отрисовки —
 * так, как они стоят в разметке с самого начала.
 */
async function render<T>(host: Type<T>, prepare?: (page: T) => void): Promise<ComponentFixture<T>> {
	const fixture = TestBed.createComponent(host)

	current = fixture
	prepare?.(fixture.componentInstance)
	fixture.detectChanges()
	await nextFrame()

	return fixture
}

/**
 * Перепроверить хост: событие дошло до ядра и его состояния, а разметку
 * приложение без Zone.js перепроверяет на своём такте — тест делает это сразу.
 */
function check(): void {
	current?.detectChanges()
}

/** Узел по селектору в документе: панель телепортирована мимо хоста. */
const node = (selector: string, scope: ParentNode = document) => find(scope, selector, HTMLElement)

const root = () => node('.so-tooltip')
const trigger = () => node('.so-test-trigger')
const panel = () => node('.so-tooltip__panel')
const isOpen = (element: HTMLElement = panel()) => element.style.display !== 'none'

function enter(target: Element): void {
	target.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))
	check()
}

function leave(target: Element): void {
	target.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }))
	check()
}

/** Нажатие мышью — `pointerdown`, как его слушают плагины. */
function pointerDown(target: Element): void {
	target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }))
	check()
}

/** Клавиша на элементе под фокусом. Отдаёт событие: по нему видно, погашена ли она. */
function press(key: string): KeyboardEvent {
	const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })

	;(document.activeElement ?? document.body).dispatchEvent(event)
	check()

	return event
}

describe('разметка', () => {
	it('корень — span с триггером, панель телепортирована в body и скрыта', async () => {
		await render(Page)

		expect(root().localName).toBe('span')
		expect(root().contains(trigger())).toBe(true)
		expect(root().contains(panel())).toBe(false)
		expect(panel().parentElement).toBe(document.body)
		expect(isOpen()).toBe(false)
	})

	it('панель — подсказка, не фокусируется, помечена владельцем, текст — в обёртке', async () => {
		await render(Page)

		expect(panel().getAttribute('role')).toBe('tooltip')
		expect(panel().hasAttribute('tabindex')).toBe(false)
		expect(panel().hasAttribute('aria-hidden')).toBe(false)
		// Пометка — от id монтирования подсказки (номер сборки в приложении)
		expect(panel().dataset['owner']).toBeTruthy()
		expect(node('.so-tooltip__content', panel()).textContent?.trim()).toBe('Сохранить черновик')
	})

	it('aria-describedby триггера ведёт на панель — и у закрытой подсказки', async () => {
		await render(Page)

		expect(isOpen()).toBe(false)
		expect(document.getElementById(trigger().getAttribute('aria-describedby') ?? '')).toBe(
			panel(),
		)
	})

	it('ARIA — на панели и триггере, не на корне', async () => {
		await render(Page)

		expect(root().hasAttribute('role')).toBe(false)
		expect(root().hasAttribute('aria-describedby')).toBe(false)
	})
})

/**
 * `type="label"`: подсказка — имя триггера. Нужна кнопке-иконке: с
 * `aria_label` и подсказкой-описанием скринридер прочёл бы один текст дважды.
 * Меняется только ссылка триггера — панель та же и так же всегда в документе.
 */
describe('подсказка-имя', () => {
	it('aria-labelledby триггера ведёт на панель, aria-describedby нет — и у закрытой', async () => {
		await render(Page, (page) => page.type.set('label'))

		expect(isOpen()).toBe(false)
		expect(document.getElementById(trigger().getAttribute('aria-labelledby') ?? '')).toBe(
			panel(),
		)
		expect(trigger().hasAttribute('aria-describedby')).toBe(false)
		expect(panel().getAttribute('role')).toBe('tooltip')
	})

	it('смена type из разметки переключает атрибут ссылки — и обратно', async () => {
		const fixture = await render(Page, (page) => page.type.set('description'))
		const { type } = fixture.componentInstance
		const id = panel().id

		expect(trigger().getAttribute('aria-describedby')).toBe(id)
		expect(trigger().hasAttribute('aria-labelledby')).toBe(false)

		type.set('label')
		check()

		expect(trigger().getAttribute('aria-labelledby')).toBe(id)
		expect(trigger().hasAttribute('aria-describedby')).toBe(false)

		type.set('description')
		check()

		expect(trigger().getAttribute('aria-describedby')).toBe(id)
		expect(trigger().hasAttribute('aria-labelledby')).toBe(false)
	})

	it('снятый type возвращает подсказку к описанию', async () => {
		const fixture = await render(Page, (page) => page.type.set('label'))

		fixture.componentInstance.type.set(undefined)
		check()

		expect(trigger().getAttribute('aria-describedby')).toBe(panel().id)
		expect(trigger().hasAttribute('aria-labelledby')).toBe(false)
	})

	it('type из инстанса доходит до триггера так же, как из разметки', async () => {
		const fixture = await render(Page)

		fixture.componentInstance.ctrl.type = 'label'
		check()

		expect(trigger().getAttribute('aria-labelledby')).toBe(panel().id)
		expect(trigger().hasAttribute('aria-describedby')).toBe(false)
	})
})

/**
 * Ссылка на панель — scope триггера, и меняется она со сменой `type`, а
 * триггер — тот же узел: вывод шаблона отдаёт новый контекст тому же
 * представлению. Показ ссылку не меняет, и узел тоже остаётся.
 */
describe('триггер — тот же узел', () => {
	it('после показа и после смены type', async () => {
		const fixture = await render(Page)
		const first = trigger()

		first.focus()
		enter(root())

		expect(isOpen()).toBe(true)
		expect(trigger()).toBe(first)

		fixture.componentInstance.ctrl.type = 'label'
		check()

		expect(trigger()).toBe(first)
		expect(first.getAttribute('aria-labelledby')).toBe(panel().id)
		expect(document.activeElement).toBe(first)
	})
})

describe('показ и скрытие', () => {
	it('курсор на корне показывает, уход — прячет', async () => {
		await render(Page)

		enter(root())

		expect(isOpen()).toBe(true)
		expect(panel().dataset['layer']).toMatch(/^\d+$/)

		leave(root())

		expect(isOpen()).toBe(false)
	})

	it('нажатие на триггер прячет', async () => {
		await render(Page)

		enter(root())
		pointerDown(trigger())

		expect(isOpen()).toBe(false)
	})

	it('Escape прячет, фокус остаётся на месте', async () => {
		await render(Page)

		trigger().focus()
		enter(root())

		const event = press('Escape')

		expect(event.defaultPrevented).toBe(true)
		expect(isOpen()).toBe(false)
		expect(document.activeElement).toBe(trigger())
	})

	it('open из инстанса показывает так же, как наведение; (soChangeOpen) слышит оба пути', async () => {
		const fixture = await render(Page)
		const { ctrl, changes } = fixture.componentInstance

		ctrl.open = true
		check()

		expect(isOpen()).toBe(true)

		leave(root())
		enter(root())
		leave(root())

		expect(ctrl.open).toBe(false)
		expect(isOpen()).toBe(false)
		expect(changes).toEqual([true, false, true, false])
	})

	it('open из разметки показывает и прячет', async () => {
		const fixture = await render(Page, (page) => page.open.set(false))
		const { open } = fixture.componentInstance

		open.set(true)
		check()

		expect(isOpen()).toBe(true)

		open.set(false)
		check()

		expect(isOpen()).toBe(false)
	})

	it('placement доходит до якоря: сторона панели — в data-placement', async () => {
		await render(Page, (page) => {
			page.open.set(true)
			page.placement.set('bottom-end')
		})
		await nextFrame()

		expect(panel().dataset['placement']).toBe('bottom-end')
	})

	it('центр доходит до якоря: data-placement без суффикса', async () => {
		await render(Page, (page) => {
			page.open.set(true)
			page.placement.set('bottom')
		})
		await nextFrame()

		expect(panel().dataset['placement']).toBe('bottom')
	})
})

describe('в открытом поповере', () => {
	const popoverPanel = () => node('.so-popover__panel')

	/** Открыть поповер кликом и дождаться, пока фокус уйдёт в панель. */
	async function openPopover(): Promise<void> {
		const target = node('.so-test-popover-trigger')

		target.dispatchEvent(
			new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse' }),
		)
		target.focus()
		target.click()
		check()
		await nextFrame()
	}

	it('Escape закрывает только подсказку, второй — уже поповер', async () => {
		await render(PopoverPage)
		await openPopover()

		expect(document.activeElement).toBe(trigger())

		enter(root())

		expect(isOpen()).toBe(true)

		press('Escape')

		expect(isOpen()).toBe(false)
		expect(isOpen(popoverPanel())).toBe(true)

		press('Escape')

		expect(isOpen(popoverPanel())).toBe(false)
	})

	it('подсказка — слой выше панели поповера: нажатие в неё поповер не закрывает', async () => {
		await render(PopoverPage)
		await openPopover()

		enter(root())

		expect(Number(panel().dataset['layer'])).toBeGreaterThan(
			Number(popoverPanel().dataset['layer']),
		)

		pointerDown(panel())

		expect(isOpen(popoverPanel())).toBe(true)
	})
})

describe('Angular', () => {
	/**
	 * Якорь — корень: его узел шаблону отдаёт база (`rootElement()`). Место
	 * якоря задаёт тест — jsdom раскладку не считает: подсказка снизу по началу
	 * триггера встаёт под корнем, в 6 px от него.
	 */
	it('якорь — корень: открытая подсказка встаёт у него, в 6 px', async () => {
		const fixture = await render(Page, (page) => page.placement.set('bottom-start'))

		vi.spyOn(root(), 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 50, 80, 20))

		fixture.componentInstance.open.set(true)
		check()
		await nextFrame()

		expect(isOpen()).toBe(true)
		expect(panel().style.left).toBe('100px')
		expect(panel().style.top).toBe('76px')
	})

	/**
	 * Корень Angular не снимается, а прячется, а панель увезена в `body`:
	 * `rendered` подсказка передаёт ей сама, иначе открытая подсказка осталась
	 * бы на виду без своего триггера.
	 */
	it('rendered: false прячет корень и открытую панель', async () => {
		const fixture = await render(Page, (page) => page.open.set(true))
		const { rendered } = fixture.componentInstance

		expect(isOpen()).toBe(true)

		rendered.set(false)
		check()

		expect(root().style.display).toBe('none')
		expect(isOpen()).toBe(false)

		rendered.set(true)
		check()

		expect(root().style.display).toBe('')
		expect(isOpen()).toBe(true)
	})
})
