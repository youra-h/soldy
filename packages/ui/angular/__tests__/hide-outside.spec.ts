/**
 * THideOutsidePlugin под Angular — фон модального слоя на настоящей разметке.
 *
 * Сценарии — те же, что у Vue (`hide-outside.spec.ts`). Модальным слоем служит
 * Frame, которому плагин поставлен снаружи, из `(soBundleCreate)`, с
 * открытостью по `visible`: так плагин проверяется один, без остальных
 * плагинов модального окна (окно целиком — `dialog.spec.ts`). Внутри слоя —
 * Select. Его список телепортирован в `body` соседом окна, а пока закрыт,
 * лежит там без номера слоя выше окна: слой пишет номер только при показе.
 * Здесь проверяется то, ради чего плагин пересчитывает пометки, а не снимает
 * их при открытии: открытый список получает номер выше окна и остаётся
 * доступным скринридеру.
 *
 * Своё у Angular — где лежит Select: в панели Frame, которую база увозит в
 * `body`, а список Select — второй Frame, в шаблоне Select, — уезжает туда
 * же своим соседом.
 *
 * Правила пометки по отдельности — `plugins/__tests__/hide-outside.plugin.spec.ts`.
 */

import { describe, it, expect } from 'vitest'
import { Component, signal } from '@angular/core'
import { TestBed, type ComponentFixture } from '@angular/core/testing'
import { THideOutsidePlugin, TPluginBundle } from '@soldy-ui/plugins'
import { TFrameComponent, TSelectComponent, TSelectItemComponent } from '@soldy-ui/angular'
import { find, nextFrame } from './mount'

/**
 * Страница и модальный слой с Select внутри. Слой смонтирован скрытым, как
 * всякий Frame; открытость — сигнал страницы.
 */
@Component({
	selector: 'probe-hide-outside',
	imports: [TFrameComponent, TSelectComponent, TSelectItemComponent],
	template: `<div>
		<button class="so-test-page">Страница</button>
		<div
			so-frame
			class="so-test-dialog"
			[visible]="shown()"
			(soBundleCreate)="hideOutside($event)"
		>
			<div so-select class="so-test-select">
				<div so-select-item value="a" text="Первый"></div>
				<div so-select-item value="b" text="Второй"></div>
			</div>
		</div>
	</div>`,
})
class Page {
	readonly shown = signal(false)

	/** Плагин ставится так, как его поставит модальное окно: открытость — `visible`. */
	hideOutside(bundle: unknown): void {
		if (bundle instanceof TPluginBundle) bundle.use(THideOutsidePlugin, { property: 'visible' })
	}
}

/** Смонтированный хост теста — его перепроверяют действия. */
let current: ComponentFixture<Page> | null = null

async function render(): Promise<ComponentFixture<Page>> {
	current = TestBed.createComponent(Page)
	current.detectChanges()
	await settle()

	return current
}

/** Проверка, наблюдатель плагина на микрозадаче и кадр — корень плагины получают через него. */
async function settle(): Promise<void> {
	current?.detectChanges()
	await Promise.resolve()
	await nextFrame()
	current?.detectChanges()
}

const node = (selector: string) => find(document, selector, HTMLElement)

/** Спрятан ли узел от скринридера — сам или через предка. */
const muted = (element: Element) => element.closest('[aria-hidden="true"]') !== null

/** Кто в документе несёт `aria-hidden` и с каким значением — чтобы сравнить «до» и «после». */
const ariaHiddenNodes = () =>
	new Map(
		[...document.querySelectorAll('[aria-hidden]')].map((element) => [
			element,
			element.getAttribute('aria-hidden'),
		]),
	)

const field = () => node('.so-test-select input')
const list = () => node('.so-select__panel')

describe('модальный слой с Select внутри', () => {
	it('окно показано — страница под aria-hidden, окно и его содержимое доступны', async () => {
		const fixture = await render()

		fixture.componentInstance.shown.set(true)
		await settle()

		expect(muted(node('.so-test-page'))).toBe(true)
		expect(muted(node('.so-test-dialog'))).toBe(false)
		expect(muted(field())).toBe(false)
	})

	it('закрытый список Select спрятан, открытый — доступен', async () => {
		const fixture = await render()

		fixture.componentInstance.shown.set(true)
		await settle()

		// Список смонтирован и скрыт, номера слоя выше окна у него ещё нет
		expect(muted(list())).toBe(true)

		field().click()
		await settle()

		expect(field().getAttribute('aria-expanded')).toBe('true')
		expect(muted(list())).toBe(false)
		expect(muted(node('.so-select__panel [role="option"]'))).toBe(false)
	})

	it('окно скрыто — всё как было, в том числе чужие aria-hidden', async () => {
		const fixture = await render()
		const before = ariaHiddenNodes()

		fixture.componentInstance.shown.set(true)
		await settle()

		field().click()
		await settle()

		fixture.componentInstance.shown.set(false)
		await settle()

		expect(ariaHiddenNodes()).toEqual(before)
		expect(muted(node('.so-test-page'))).toBe(false)
		expect(muted(list())).toBe(false)
	})
})
