/**
 * Выходы в строгом шаблоне потребителя.
 *
 * Шаблоны хостов ниже написаны так, как их пишет приложение: привязка выхода
 * с `$event` в обработчик точного типа. Проверяет их «Типы — Angular» (`ngc`
 * со `strictTemplates`, как в новом приложении Angular). Строгая проверка
 * читает выход как поле класса — `_t1["actionPress"].subscribe(($event) => …)`,
 * — а эмиттеры ставит `TComponentBase` по списку имён, и поля у класса нет.
 * Тип ему даёт сгенерированный `T<Имя>Outputs`, от которого наследуется
 * компонент; без него привязка падает с TS7053.
 *
 * Поле с `any` шаблон пропустил бы молча, поэтому тип поля сверен ещё и
 * `expectTypeOf` — его ловит тот же `ngc`. В рантайме обработчик получает
 * первый аргумент события ядра: его отдаёт `syncEvents`.
 *
 * Хост — на каждый компонент экспорта: выход типизирован, только если
 * компонент наследует свой `T<Имя>Outputs`, а не `TComponentBase` напрямую.
 */

import { describe, it, expect, expectTypeOf } from 'vitest'
import { Component, type EventEmitter } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { TComponent, TComponentView, type TPluginEvent } from '@soldy-ui/core'
import { TButtonComponent, TComponentComponent, TComponentViewComponent } from '@soldy-ui/angular'

@Component({
	standalone: true,
	imports: [TButtonComponent],
	template: `<soldy-button text="Save" (actionPress)="onPress($event)" />`,
})
class ButtonHost {
	readonly presses: (MouseEvent | KeyboardEvent)[] = []

	onPress(event: MouseEvent | KeyboardEvent): void {
		this.presses.push(event)
	}
}

@Component({
	standalone: true,
	imports: [TComponentViewComponent],
	template: `<soldy-component-view [ctrl]="ctrl" (changeVisible)="onVisible($event)" />`,
})
class ComponentViewHost {
	readonly ctrl = new TComponentView()
	readonly changes: boolean[] = []

	onVisible(visible: boolean): void {
		this.changes.push(visible)
	}
}

@Component({
	standalone: true,
	imports: [TComponentComponent],
	template: `<soldy-component [ctrl]="ctrl" (pluginEvent)="onPluginEvent($event)" />`,
})
class ComponentHost {
	readonly ctrl = new TComponent()
	readonly received: TPluginEvent[] = []

	onPluginEvent(event: TPluginEvent): void {
		this.received.push(event)
	}
}

/**
 * Кадр: `TElementPlugin` объявляет узел через `requestAnimationFrame`, и
 * слушатели `TActionPlugin` появляются только после него.
 */
const frame = (): Promise<void> => new Promise((resolve) => requestAnimationFrame(() => resolve()))

describe('выход в строгом шаблоне · $event — первый аргумент события ядра', () => {
	it('Button: (actionPress) получает событие DOM, которое дало press', async () => {
		const fixture = TestBed.createComponent(ButtonHost)

		fixture.detectChanges()
		await frame()

		const host: HTMLElement = fixture.nativeElement
		const root = host.querySelector('soldy-button')?.firstElementChild

		if (!root) throw new Error('Корень Button не отрисован')

		const click = new MouseEvent('click', { bubbles: true, cancelable: true })

		root.dispatchEvent(click)

		expect(fixture.componentInstance.presses).toHaveLength(1)
		expect(fixture.componentInstance.presses[0]).toBe(click)
	})

	it('ComponentView: (changeVisible) получает новое значение', () => {
		const fixture = TestBed.createComponent(ComponentViewHost)

		fixture.detectChanges()

		fixture.componentInstance.ctrl.visible = false

		expect(fixture.componentInstance.changes).toEqual([false])
	})

	it('Component: (pluginEvent) получает конверт события внешнего плагина', () => {
		const fixture = TestBed.createComponent(ComponentHost)
		const event: TPluginEvent = { name: 'timer:tick', args: [500] }

		fixture.detectChanges()

		fixture.componentInstance.ctrl.events.emit('plugin:event', event)

		expect(fixture.componentInstance.received).toHaveLength(1)
		expect(fixture.componentInstance.received[0]).toBe(event)
	})
})

/**
 * Тип поля — то, что получает `$event`. С `any` на его месте шаблоны выше
 * скомпилировались бы при любом обработчике.
 */
describe('тип выхода · эмиттер первого аргумента события ядра', () => {
	it('у события с аргументом — его тип', () => {
		expectTypeOf<TButtonComponent['actionPress']>().toEqualTypeOf<
			EventEmitter<MouseEvent | KeyboardEvent>
		>()
		expectTypeOf<TComponentViewComponent['changeVisible']>().toEqualTypeOf<
			EventEmitter<boolean>
		>()
		expectTypeOf<TComponentComponent['pluginEvent']>().toEqualTypeOf<
			EventEmitter<TPluginEvent>
		>()
	})

	it('у события без аргументов — undefined', () => {
		expectTypeOf<TComponentViewComponent['show']>().toEqualTypeOf<EventEmitter<undefined>>()
		expectTypeOf<TButtonComponent['elementRemoved']>().toEqualTypeOf<EventEmitter<undefined>>()
	})
})
