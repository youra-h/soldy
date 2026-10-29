/**
 * Outputs in the consumer's strict template and their emitters at runtime.
 *
 * The host templates below are written as an application writes them: an
 * output binding with `$event` into a handler of the exact type. «Типы —
 * Angular» checks them (`ngc` with `strictTemplates`, as in a new Angular
 * application). The strict check reads an output as a class property —
 * `_t1["soActionPress"].subscribe(($event) => …)`. The type comes from the
 * `declare` field of the generated `T<Name>Surface` the component extends;
 * without it the binding fails with TS7053.
 *
 * An output typed `any` would pass the template silently, so its type is also
 * checked by `expectTypeOf` — the same `ngc` catches it. At runtime the
 * handler gets the core event's argument: `syncEvents` emits it.
 *
 * The output's emitter is created by its first read — the same template
 * binding or a subscription from code — through the getter the base defines on
 * the class prototype, once per class. An output nobody read creates no
 * emitter, even after core events: there is no one to give the event to. A
 * created emitter is an own property of the instance under the output's name,
 * and that is how the specs see what was created.
 *
 * A host per exported component: an output is typed only if the component
 * extends its own `T<Name>Surface`, not `TComponentBase` directly.
 *
 * An output's name is `so` and the full name of the core event in camelCase,
 * for every event: on `(x)` of an element Angular listens to both the output
 * `x` and the DOM event `x`, and the prefix tells whose event it is, for the
 * whole category at once. Checked against all exported descriptors of setup,
 * and against DOM events — by the schema of the Angular compiler.
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
 * A frame: `TElementPlugin` announces the node through `requestAnimationFrame`,
 * and the listeners of `TActionPlugin` appear only after it.
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
 * The output's type is what `$event` gets. With `any` in its place the
 * templates above would compile with any handler.
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

/** Hosts with no bound outputs — one per exported component. */
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

/** A host with one output binding: nobody reads the other outputs of Button. */
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
 * Outputs whose emitter is created: it is an own property of the instance
 * under the output's name. Until the output is read, the name has only the
 * getter on the prototype.
 */
const created = (instance: object, outputs: readonly string[]): string[] =>
	outputs.filter((output) => Object.hasOwn(instance, output))

/** The getter of an output an object holds itself — the prototype of a class. */
const getterOf = (holder: object, output: string): unknown =>
	Object.getOwnPropertyDescriptor(holder, output)?.get

describe('эмиттер выхода · заводит первое чтение', () => {
	it('Button: без привязанных выходов эмиттеров нет и после событий ядра', async () => {
		const fixture = TestBed.createComponent(BareButtonHost)

		fixture.detectChanges()
		// A frame — the node is announced: `element:ready` and `ready` have passed
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

	/**
	 * The getters are the base's, on the prototype of the component's class:
	 * the first instance defines them, and the next one neither replaces them
	 * nor gets its own.
	 */
	it('геттер выхода — на прототипе класса, один на класс', () => {
		const getters = (): unknown[] =>
			ButtonOutputNames.map((output) => getterOf(TButtonComponent.prototype, output))
		const first = TestBed.createComponent(BareButtonHost)

		first.detectChanges()

		const defined = getters()

		expect(defined.filter((getter) => typeof getter !== 'function')).toEqual([])

		const second = TestBed.createComponent(BareButtonHost)

		second.detectChanges()

		expect(getters().filter((getter, index) => getter !== defined[index])).toEqual([])
		expect(created(second.componentInstance.button(), ButtonOutputNames)).toEqual([])
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
	 * The event sink is set in `ngOnInit`, and it looks the emitter up on every
	 * event: an output read later gets the events from that moment on.
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
	 * An emitter created in the component's context takes its `DestroyRef`, and
	 * `outputToObservable` completes with the component. Created outside the
	 * context — by the first read from code, as here — it would not know the
	 * `DestroyRef`, and the stream would stay open.
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
 * An instance of a declaration in a fixture: TestBed builds a component
 * itself and puts a directive on an element. The container host the consumer
 * writes the directive of a rootless component on TestBed does not build, and
 * the outputs do not care where it stands.
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
 * The decorator of `T<Name>Surface` declares the outputs, and the base defines
 * their getters from the generator's list of the same names. Here every
 * declared output has a getter on the prototype of its class: Angular reads an
 * output only when it is bound, and an output without a getter would fail only
 * for whoever binds it. Rootless components — directives — the same.
 */
describe('выходы компонентов экспорта · геттер на каждый выход', () => {
	// The soldy components are not a hand-written list: a new one is checked by itself
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

			const prototype: object = Object.getPrototypeOf(instance)

			expect(
				outputs.filter((output) => typeof getterOf(prototype, output) !== 'function'),
			).toEqual([])

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
 * Component descriptors from the export of `@soldy-ui/setup` — not a
 * hand-written list, as in the setup specs: a new one is checked by itself. A
 * descriptor factory is `<Name>Descriptor` with a capital (the mechanics'
 * `defineDescriptor` builds it rather than returns a descriptor); plugin
 * definitions drop out — they have no `getProps`.
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

/** DOM events the Angular compiler knows — over all elements of its schema. */
function domEvents(): ReadonlySet<string> {
	const schema = new DomElementSchemaRegistry()

	return new Set(
		schema.allKnownElementNames().flatMap((element) => schema.allKnownEventsOfElement(element)),
	)
}

/** The parts of the core's full name capitalized: `show:before` → `ShowBefore`. */
const pascal = (event: string): string =>
	event
		.split(/[-:]/)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join('')

/**
 * On `(x)` of an element Angular sets both a subscription to the output `x`
 * and a listener of the DOM event `x`: outputs share the template with DOM
 * events. The `so` prefix tells whose event it is and stands on every output,
 * not only on those that would clash with a DOM event: `(soShow)` next to
 * `(soShowBefore)`, `(soChangeValue)` and `(soElementReady)` — one scheme for
 * the whole category.
 *
 * Descriptors are iterated, not Angular components: the unported ones are
 * checked at once too — Select with `close`, collections with `reset`. The
 * output names are those the codegen writes (`useOutputs`), the DOM events —
 * from the schema of the Angular compiler. Compared by the exact name:
 * `addEventListener` is case-sensitive.
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

	/** The button's outputs as the consumer's template sees them: one scheme, none without the prefix. */
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
