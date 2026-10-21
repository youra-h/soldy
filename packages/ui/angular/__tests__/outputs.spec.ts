/**
 * Выходы в строгом шаблоне потребителя и их эмиттеры в рантайме.
 *
 * Шаблоны хостов ниже написаны так, как их пишет приложение: привязка выхода
 * с `$event` в обработчик точного типа. Проверяет их «Типы — Angular» (`ngc`
 * со `strictTemplates`, как в новом приложении Angular). Строгая проверка
 * читает выход как свойство класса — `_t1["soActionPress"].subscribe(($event) => …)`.
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
 *
 * Имя выхода — `so` и полное имя события ядра в camelCase, у каждого события:
 * на `(x)` у элемента Angular слушает и выход `x`, и событие DOM `x`, и
 * префикс говорит, чьё событие, у всей категории сразу. Сверка — по всем
 * дескрипторам экспорта setup, а с событиями DOM — по схеме компилятора
 * Angular.
 */

import { describe, it, expect, expectTypeOf } from 'vitest'
import { DomElementSchemaRegistry } from '@angular/compiler'
import { Component, EventEmitter, viewChild } from '@angular/core'
import { outputToObservable } from '@angular/core/rxjs-interop'
import { TestBed } from '@angular/core/testing'
import { TButton, TComponent, TComponentView, type TPluginEvent } from '@soldy-ui/core'
import * as setup from '@soldy-ui/setup'
import { ButtonDescriptor, InputDescriptor, type IComponentDescriptor } from '@soldy-ui/setup'
import {
	ButtonOutputNames,
	ComponentOutputNames,
	ComponentViewOutputNames,
	TButtonComponent,
	TComponentComponent,
	TComponentViewComponent,
	useOutputs,
} from '@soldy-ui/angular'
import { exportedDeclarations, type TDeclaration } from './declarations'

@Component({
	standalone: true,
	imports: [TButtonComponent],
	template: `<button so-button text="Save" (soActionPress)="onPress($event)"></button>`,
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
	template: `<div so-component-view [ctrl]="ctrl" (soChangeVisible)="onVisible($event)"></div>`,
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
	template: `<ng-container so-component [ctrl]="ctrl" (soPluginEvent)="onPluginEvent($event)" />`,
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
	it('Button: (soActionPress) получает событие DOM, которое дало press', async () => {
		const fixture = TestBed.createComponent(ButtonHost)

		fixture.detectChanges()
		await frame()

		const host: HTMLElement = fixture.nativeElement
		const root = host.querySelector('[so-button]')

		if (!root) throw new Error('Корень Button не отрисован')

		const click = new MouseEvent('click', { bubbles: true, cancelable: true })

		root.dispatchEvent(click)

		expect(fixture.componentInstance.presses).toHaveLength(1)
		expect(fixture.componentInstance.presses[0]).toBe(click)
	})

	it('ComponentView: (soChangeVisible) получает новое значение', () => {
		const fixture = TestBed.createComponent(ComponentViewHost)

		fixture.detectChanges()

		fixture.componentInstance.ctrl.visible = false

		expect(fixture.componentInstance.changes).toEqual([false])
	})

	it('Component: (soPluginEvent) получает конверт события внешнего плагина', () => {
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
		expectTypeOf<TButtonComponent['soActionPress']>().toEqualTypeOf<EventEmitter<MouseEvent>>()
		expectTypeOf<TComponentViewComponent['soChangeVisible']>().toEqualTypeOf<
			EventEmitter<boolean>
		>()
		expectTypeOf<TComponentComponent['soPluginEvent']>().toEqualTypeOf<
			EventEmitter<TPluginEvent>
		>()
	})

	it('у события без аргументов — undefined', () => {
		expectTypeOf<TComponentViewComponent['soShow']>().toEqualTypeOf<EventEmitter<undefined>>()
		expectTypeOf<TButtonComponent['soElementRemoved']>().toEqualTypeOf<
			EventEmitter<undefined>
		>()
	})
})

/** Хосты без привязанных выходов — по одному на компонент экспорта. */
@Component({
	standalone: true,
	imports: [TButtonComponent],
	template: `<button so-button [ctrl]="ctrl"></button>`,
})
class BareButtonHost {
	readonly ctrl = new TButton({ text: 'Save' })
	readonly button = viewChild.required(TButtonComponent)
}

@Component({
	standalone: true,
	imports: [TComponentViewComponent],
	template: `<div so-component-view [ctrl]="ctrl"></div>`,
})
class BareComponentViewHost {
	readonly ctrl = new TComponentView()
	readonly view = viewChild.required(TComponentViewComponent)
}

@Component({
	standalone: true,
	imports: [TComponentComponent],
	template: `<ng-container so-component [ctrl]="ctrl" />`,
})
class BareComponentHost {
	readonly ctrl = new TComponent()
	readonly component = viewChild.required(TComponentComponent)
}

/** Хост с одной привязкой выхода: остальные выходы Button никто не читает. */
@Component({
	standalone: true,
	imports: [TButtonComponent],
	template: `<button so-button [ctrl]="ctrl" (soChangeVisible)="onVisible($event)"></button>`,
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
		const emitter = view.soChangeVisible

		expect(emitter).toBeInstanceOf(EventEmitter)
		expect(created(view, ComponentViewOutputNames)).toEqual(['soChangeVisible'])
		expect(view.soChangeVisible).toBe(emitter)
	})

	it('привязка в шаблоне заводит эмиттер только своему выходу', () => {
		const fixture = TestBed.createComponent(BoundButtonHost)

		fixture.detectChanges()

		fixture.componentInstance.ctrl.visible = false

		expect(fixture.componentInstance.changes).toEqual([false])
		expect(created(fixture.componentInstance.button(), ButtonOutputNames)).toEqual([
			'soChangeVisible',
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

		fixture.componentInstance.view().soChangeVisible.subscribe((visible) => {
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

		outputToObservable(fixture.componentInstance.view().soChangeVisible).subscribe({
			complete: () => {
				completed = true
			},
		})

		fixture.destroy()

		expect(completed).toBe(true)
	})
})

/**
 * Экземпляр объявления в фикстуре: компонент TestBed строит сам, а директиву
 * ставит на элемент. Хоста-контейнера, на который директиву компонента без
 * корня пишет потребитель, TestBed не строит, а выходам всё равно, где она
 * стоит.
 */
function mountDeclaration({ kind, type }: TDeclaration): {
	readonly fixture: { detectChanges(): void }
	readonly instance: unknown
} {
	if (kind === 'component') {
		const fixture = TestBed.createComponent(type)

		return { fixture, instance: fixture.componentInstance }
	}

	const fixture = TestBed.createDirective(type, { tagName: 'div' })

	return { fixture, instance: fixture.directiveInstance }
}

/**
 * Выходы объявляет декоратор `T<Имя>Surface`, а эмиттер заводит его же
 * геттер — оба из одного списка генератора. Здесь видно, что на каждый
 * объявленный выход геттер есть: Angular читает выход, только когда его
 * привязали, и выход без геттера упал бы лишь у того, кто его привяжет. У
 * компонентов без корня — директив — так же.
 */
describe('выходы компонентов экспорта · геттер на каждый выход', () => {
	// Компоненты soldy — не ручным списком: новый попадёт под проверку сам
	const components = exportedDeclarations().filter(({ soldy }) => soldy)

	it('компоненты найдены в экспорте', () => {
		expect(components.map(({ name }) => name)).toEqual(
			expect.arrayContaining([
				'TButtonComponent',
				'TComponentViewComponent',
				'TComponentComponent',
				'TIconComponent',
				'TProgressSpinnerComponent',
				'TSkeletonComponent',
				'TLabelComponent',
				'TFieldComponent',
				'TInputComponent',
				'TNumberInputComponent',
				'TTextareaComponent',
				'TCheckBoxComponent',
				'TSwitchComponent',
				'TVirtualComponent',
				'TDragAndDropComponent',
			]),
		)
	})

	it.each(components.map((declaration) => [declaration.name, declaration] as const))(
		'%s: чтение каждого выхода заводит ровно его эмиттер',
		async (_name, declaration) => {
			const { outputs } = declaration
			const { fixture, instance } = mountDeclaration(declaration)

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

function isComponentDescriptor(value: unknown): value is IComponentDescriptor {
	return typeof value === 'object' && value !== null && 'getProps' in value && 'plugins' in value
}

/**
 * Дескрипторы компонентов из экспорта `@soldy-ui/setup` — не ручным списком,
 * как в спеках setup: новый попадёт под проверку сам. Фабрика дескриптора —
 * `<Имя>Descriptor` с заглавной (`defineDescriptor` механики её строит, а не
 * отдаёт дескриптор); определения плагинов отсеиваются — у них нет `getProps`.
 */
function exportedDescriptors(): (readonly [name: string, descriptor: IComponentDescriptor])[] {
	const entries: Record<string, unknown> = setup
	const result: (readonly [string, IComponentDescriptor])[] = []

	for (const [name, factory] of Object.entries(entries)) {
		if (!/^[A-Z]\w*Descriptor$/.test(name) || typeof factory !== 'function') continue

		const value: unknown = factory()

		if (isComponentDescriptor(value)) result.push([name, value])
	}

	return result
}

/** События DOM, которые знает компилятор Angular, — по всем элементам его схемы. */
function domEvents(): ReadonlySet<string> {
	const schema = new DomElementSchemaRegistry()

	return new Set(
		schema.allKnownElementNames().flatMap((element) => schema.allKnownEventsOfElement(element)),
	)
}

/** Части полного имени ядра с заглавной: `show:before` → `ShowBefore`. */
const pascal = (event: string): string =>
	event
		.split(/[-:]/)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join('')

/**
 * На `(x)` у элемента Angular ставит и подписку на выход `x`, и слушатель
 * события DOM `x`: выходы делят шаблон с событиями DOM. Префикс `so` говорит,
 * чьё событие, и стоит у каждого выхода, а не у тех, что совпали бы с событием
 * DOM: `(soShow)` рядом с `(soShowBefore)`, `(soChangeValue)` и
 * `(soElementReady)` — одна схема на всю категорию.
 *
 * Перебираются дескрипторы, а не компоненты Angular: под проверку сразу
 * попадают и непортированные — Select с `close`, коллекции с `reset`. Имена
 * выходов — те же, что пишет кодоген (`useOutputs`), события DOM — из схемы
 * компилятора Angular. Сверка по точному имени: `addEventListener` различает
 * регистр.
 */
describe('имя выхода · so и имя ядра в camelCase', () => {
	const events = domEvents()
	const descriptors = exportedDescriptors()

	it('сверка не впустую: input в схеме, дескрипторы найдены, у Input выход soInput', () => {
		expect(events.has('input')).toBe(true)
		expect(descriptors.map(([name]) => name)).toEqual(
			expect.arrayContaining(['InputDescriptor', 'SelectDescriptor', 'ListBoxDescriptor']),
		)
		expect(useOutputs(InputDescriptor()).map(([output]) => output)).toEqual(
			expect.arrayContaining(['soInput', 'soInputValue', 'soChangeValue']),
		)
	})

	it('каждый выход каждого дескриптора — so и полное имя ядра в camelCase', () => {
		const wrong = descriptors.flatMap(([name, descriptor]) =>
			useOutputs(descriptor).flatMap(([output, event]) =>
				output === `so${pascal(event)}` ? [] : [`${name}: ${event} → ${output}`],
			),
		)

		expect(wrong).toEqual([])
	})

	/** Так выходы кнопки видит шаблон потребителя: схема одна, и без префикса нет ни одного. */
	it('Button: событие из одного слова и составное — под одной схемой', () => {
		const outputs = useOutputs(ButtonDescriptor()).map(([output]) => output)

		expect(outputs).toEqual(
			expect.arrayContaining([
				'soShow',
				'soShowBefore',
				'soHide',
				'soReady',
				'soElementReady',
				'soActionPress',
				'soActionClick',
				'soChangeVisible',
				'soChangeDisabled',
			]),
		)
		expect(outputs.filter((output) => !/^so[A-Z]/.test(output))).toEqual([])
	})

	it('ни один выход ни одного дескриптора не совпадает с событием DOM', () => {
		const clashes = descriptors.flatMap(([name, descriptor]) =>
			useOutputs(descriptor)
				.filter(([output]) => events.has(output))
				.map(([output, event]) => `${name}: ${output} ← ${event}`),
		)

		expect(clashes).toEqual([])
	})
})
