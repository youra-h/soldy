/**
 * Выходы в строгом шаблоне потребителя и их эмиттеры в рантайме.
 *
 * Шаблоны хостов ниже написаны так, как их пишет приложение: привязка выхода
 * с `$event` в обработчик точного типа. Проверяет их «Типы — Angular» (`ngc`
 * со `strictTemplates`, как в новом приложении Angular). Строгая проверка
 * читает выход как свойство класса — `_t1["actionPress"].subscribe(($event) => …)`.
 * Выход — геттер сгенерированного `T<Имя>Surface`, от которого наследуется
 * компонент, и тип даёт он; без него привязка падает с TS7053.
 *
 * Выход с `any` шаблон пропустил бы молча, поэтому его тип сверен ещё и
 * `expectTypeOf` — его ловит тот же `ngc`. В рантайме обработчик получает
 * первый аргумент события ядра: его отдаёт `syncEvents`.
 *
 * Эмиттер выхода заводит первое чтение — та же привязка в шаблоне или подписка
 * из кода. Выход, который никто не читал, эмиттера не заводит и после событий
 * ядра: на такой выход отдавать событие некому. Заведённый эмиттер —
 * собственное свойство экземпляра под именем выхода, по нему здесь и видно,
 * что заведено.
 *
 * Хост — на каждый компонент экспорта: выход типизирован, только если
 * компонент наследует свой `T<Имя>Surface`, а не `TComponentBase` напрямую.
 */

import { describe, it, expect, expectTypeOf } from 'vitest'
import { Component, EventEmitter, reflectComponentType, viewChild, type Type } from '@angular/core'
import { outputToObservable } from '@angular/core/rxjs-interop'
import { TestBed } from '@angular/core/testing'
import { TButton, TComponent, TComponentView, type TPluginEvent } from '@soldy-ui/core'
import * as angular from '@soldy-ui/angular'
import {
	ButtonOutputNames,
	ComponentOutputNames,
	ComponentViewOutputNames,
	TButtonComponent,
	TComponentComponent,
	TComponentViewComponent,
} from '@soldy-ui/angular'

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
 * Тип выхода — то, что получает `$event`. С `any` на его месте шаблоны выше
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

/** Хосты без привязанных выходов — по одному на компонент экспорта. */
@Component({
	standalone: true,
	imports: [TButtonComponent],
	template: `<soldy-button [ctrl]="ctrl" />`,
})
class BareButtonHost {
	readonly ctrl = new TButton({ text: 'Save' })
	readonly button = viewChild.required(TButtonComponent)
}

@Component({
	standalone: true,
	imports: [TComponentViewComponent],
	template: `<soldy-component-view [ctrl]="ctrl" />`,
})
class BareComponentViewHost {
	readonly ctrl = new TComponentView()
	readonly view = viewChild.required(TComponentViewComponent)
}

@Component({
	standalone: true,
	imports: [TComponentComponent],
	template: `<soldy-component [ctrl]="ctrl" />`,
})
class BareComponentHost {
	readonly ctrl = new TComponent()
	readonly component = viewChild.required(TComponentComponent)
}

/** Хост с одной привязкой выхода: остальные выходы Button никто не читает. */
@Component({
	standalone: true,
	imports: [TButtonComponent],
	template: `<soldy-button [ctrl]="ctrl" (changeVisible)="onVisible($event)" />`,
})
class BoundButtonHost {
	readonly ctrl = new TButton({ text: 'Save' })
	readonly button = viewChild.required(TButtonComponent)
	readonly changes: boolean[] = []

	onVisible(visible: boolean): void {
		this.changes.push(visible)
	}
}

/**
 * Выходы, чей эмиттер уже заведён: он — собственное свойство экземпляра под
 * именем выхода. Пока выход не читали, на этом имени только геттер прототипа.
 */
const created = (instance: object, outputs: readonly string[]): string[] =>
	outputs.filter((output) => Object.hasOwn(instance, output))

describe('эмиттер выхода · заводит первое чтение', () => {
	it('Button: без привязанных выходов эмиттеров нет и после событий ядра', async () => {
		const fixture = TestBed.createComponent(BareButtonHost)

		fixture.detectChanges()
		// Кадр — узел объявлен: прошли `element:ready` и `ready`
		await frame()

		fixture.componentInstance.ctrl.visible = false
		fixture.componentInstance.ctrl.text = 'Saved'
		fixture.detectChanges()

		expect(created(fixture.componentInstance.button(), ButtonOutputNames)).toEqual([])
	})

	it('ComponentView: без привязанных выходов эмиттеров нет и после событий ядра', async () => {
		const fixture = TestBed.createComponent(BareComponentViewHost)

		fixture.detectChanges()
		await frame()

		fixture.componentInstance.ctrl.visible = false
		fixture.detectChanges()

		expect(created(fixture.componentInstance.view(), ComponentViewOutputNames)).toEqual([])
	})

	it('Component: без привязанных выходов эмиттеров нет и после событий ядра', () => {
		const fixture = TestBed.createComponent(BareComponentHost)

		fixture.detectChanges()

		fixture.componentInstance.ctrl.events.emit('plugin:event', {
			name: 'timer:tick',
			args: [500],
		})

		expect(created(fixture.componentInstance.component(), ComponentOutputNames)).toEqual([])
	})

	it('чтение выхода заводит только его эмиттер, повторное отдаёт тот же', () => {
		const fixture = TestBed.createComponent(BareComponentViewHost)

		fixture.detectChanges()

		const view = fixture.componentInstance.view()
		const emitter = view.changeVisible

		expect(emitter).toBeInstanceOf(EventEmitter)
		expect(created(view, ComponentViewOutputNames)).toEqual(['changeVisible'])
		expect(view.changeVisible).toBe(emitter)
	})

	it('привязка в шаблоне заводит эмиттер только своему выходу', () => {
		const fixture = TestBed.createComponent(BoundButtonHost)

		fixture.detectChanges()

		fixture.componentInstance.ctrl.visible = false

		expect(fixture.componentInstance.changes).toEqual([false])
		expect(created(fixture.componentInstance.button(), ButtonOutputNames)).toEqual([
			'changeVisible',
		])
	})

	/**
	 * Приёмник событий стоит с `ngOnInit`, а эмиттер он ищет на каждое событие:
	 * выход, прочитанный позже, получает события с этого момента.
	 */
	it('подписка из кода после монтирования получает событие ядра', () => {
		const fixture = TestBed.createComponent(BareComponentViewHost)
		const changes: boolean[] = []

		fixture.detectChanges()

		fixture.componentInstance.view().changeVisible.subscribe((visible) => {
			changes.push(visible)
		})
		fixture.componentInstance.ctrl.visible = false

		expect(changes).toEqual([false])
	})

	/**
	 * Эмиттер, заведённый в контексте компонента, берёт его `DestroyRef`, и
	 * `outputToObservable` завершается вместе с компонентом. Заведённый вне
	 * контекста — первым чтением из кода, как здесь, — `DestroyRef` не знал бы,
	 * и поток остался бы открытым.
	 */
	it('выход, прочитанный после монтирования, завершается вместе с компонентом', () => {
		const fixture = TestBed.createComponent(BareComponentViewHost)
		let completed = false

		fixture.detectChanges()

		outputToObservable(fixture.componentInstance.view().changeVisible).subscribe({
			complete: () => {
				completed = true
			},
		})

		fixture.destroy()

		expect(completed).toBe(true)
	})
})

/**
 * Класс из экспорта: `reflectComponentType` принимает только конструктор.
 * Утилиты экспорта (`useAdapter`, `setupButton`) для JS тоже функции с
 * прототипом, но компонента за ними она не найдёт.
 */
function isConstructor(value: unknown): value is Type<unknown> {
	return typeof value === 'function' && typeof value.prototype === 'object'
}

/** Компоненты экспорта с их выходами — не ручным списком: новый попадёт под проверку сам. */
function exportedComponents(): (readonly [name: string, type: Type<unknown>, outputs: string[]])[] {
	const entries: Record<string, unknown> = angular
	const result: (readonly [string, Type<unknown>, string[]])[] = []

	for (const [name, value] of Object.entries(entries)) {
		if (!isConstructor(value)) continue

		const mirror = reflectComponentType(value)

		if (mirror) result.push([name, value, mirror.outputs.map((output) => output.propName)])
	}

	return result
}

/**
 * Выходы объявляет декоратор `T<Имя>Surface`, а эмиттер заводит его же
 * геттер — оба из одного списка генератора. Здесь видно, что на каждый
 * объявленный выход геттер есть: Angular читает выход, только когда его
 * привязали, и выход без геттера упал бы лишь у того, кто его привяжет.
 */
describe('выходы компонентов экспорта · геттер на каждый выход', () => {
	const components = exportedComponents()

	it('компоненты найдены в экспорте', () => {
		expect(components.map(([name]) => name)).toEqual(
			expect.arrayContaining([
				'TButtonComponent',
				'TComponentViewComponent',
				'TComponentComponent',
			]),
		)
	})

	it.each(components)(
		'%s: чтение каждого выхода заводит ровно его эмиттер',
		async (_name, type, outputs) => {
			const fixture = TestBed.createComponent(type)
			const instance = fixture.componentInstance

			if (typeof instance !== 'object' || instance === null) {
				throw new Error('Экземпляр компонента не создан')
			}

			fixture.detectChanges()
			await frame()

			expect(created(instance, outputs)).toEqual([])

			outputs.forEach((output, index) => {
				const emitter: unknown = Reflect.get(instance, output)

				expect(emitter).toBeInstanceOf(EventEmitter)
				expect(Reflect.get(instance, output)).toBe(emitter)
				expect(created(instance, outputs)).toEqual(outputs.slice(0, index + 1))
			})
		},
	)
})
