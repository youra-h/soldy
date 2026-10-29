/**
 * TComponentBase — the base of a soldy Angular component: the binding's
 * lifecycle, outputs, slots and the root. AGENTS.md (Angular), «Корень-хост
 * ведёт базовый `TComponentBase`».
 *
 * - constructor: the output getters (once per class), the root by its spec
 *   (`TRootSpec`, strategies in `root/`) and the subtree flag for descendants;
 * - `ngOnInit`: assembly by the component's setup function in its injection
 *   context, and the sink of core events;
 * - `ngOnChanges`: changed inputs go to the core;
 * - `ngOnDestroy`: `detach()` (the consumer hears nothing from then on),
 *   unsubscription and `destroy()`.
 *
 * A component extends the generated `T<Name>Surface`, not the base: the
 * surface declares inputs and outputs with their types for strict templates
 * and gives the base their names.
 */

import {
	Directive,
	ElementRef,
	EventEmitter,
	Injector,
	Input,
	OnChanges,
	OnDestroy,
	OnInit,
	SimpleChanges,
	TemplateRef,
	afterRenderEffect,
	computed,
	inject,
	runInInjectionContext,
	signal,
	type Signal,
} from '@angular/core'
import type { IEntity } from '@soldy-ui/core'
import type { TStateSnapshot } from '@soldy-ui/setup'
import { createRoot, type TRoot } from './root/strategies'
import type { TRootSpec } from './root/spec'
import type { SlotDirective } from './slot.directive'
import { SUBTREE_PRESENT, SubtreeDirective } from './subtree.directive'
import type { TBinding, TBindingState } from './useAdapter'

/** The component's setup function: assembles its contexts into one binding. */
export type TSetup<TInstance, TFacade = unknown, TOutputs = unknown, TOwnerFacade = unknown> = (
	ctrl: TInstance | undefined,
	inputs: object,
) => TBinding<TInstance, TFacade, TOutputs, TOwnerFacade>

/** A template reference to a node the base needs: the root, the field, the layer's companion. */
export type TTemplateRef = 'root' | 'control' | 'companion'

const VIEW_ROOT: TRootSpec = { strategy: 'view' }

/** State before the assembly: nothing — the same object on every read. */
const NO_BINDING_STATE = Object.freeze({})

/** No slot templates: the component reads no slots. */
const NO_SLOTS: readonly SlotDirective[] = Object.freeze([])

@Directive({
	// A subclass inherits `hostDirectives`, but not `providers`
	hostDirectives: [SubtreeDirective],
	host: {
		'[style.display]': '_rootDisplay()',
	},
})
export abstract class TComponentBase<
	TInstance extends IEntity,
	TFacade = unknown,
	TOutputs = unknown,
	TOwnerFacade = unknown,
>
	implements OnInit, OnChanges, OnDestroy
{
	/** A ready core instance; without it the assembly creates one. */
	@Input() ctrl?: TInstance

	private readonly _inputNames: readonly string[]
	private readonly _setup: TSetup<TInstance, TFacade, TOutputs, TOwnerFacade>
	private readonly _root: TRoot
	/** The host node: once it is out of the document, the component sends nothing (`_removed`). */
	private readonly _host: unknown = inject(ElementRef).nativeElement
	/** The first render with a binding has run: the host was in the document. */
	private _placed = false

	/** The ancestor's subtree is present. It hides only a layer moved out of the subtree. */
	private readonly _above: Signal<boolean>

	/** The root exists: where Vue's `v-if` would not remove it. */
	private readonly _present: Signal<boolean>

	/** The root is where it belongs: a layer in its target or in place, anything else always. */
	protected readonly placed: Signal<boolean>

	private readonly _binding = signal<
		TBinding<TInstance, TFacade, TOutputs, TOwnerFacade> | undefined
	>(undefined)
	private _eventsCleanup?: () => void

	private readonly _boundRoot = signal<Element | null>(null)

	/**
	 * The node the base gave `TElementPlugin`: `null` on the server, before the
	 * render and while the root is removed. A method reading the signal, as
	 * `state()`, `instance()` and `facade()`: a `computed` or a read-only copy
	 * of a signal on every instance only forwarded it.
	 */
	protected rootElement(): Element | null {
		return this._boundRoot()
	}

	/** Emitters are created and the assembly runs in its context. */
	private readonly _injector = inject(Injector)

	/** State of the core with plugin outputs and facade properties: the binding's signal. */
	state(): TBindingState<TInstance, TFacade, TOutputs, TOwnerFacade> {
		return this._binding()?.state() ?? NO_BINDING_STATE
	}

	/** The core instance: the outer `ctrl` or the one assembled in `ngOnInit`. */
	protected instance(): TInstance | undefined {
		return this._binding()?.ctrl
	}

	/** The collection facade: through its context the template calls collection commands. */
	protected facade(): TFacade | undefined {
		return this._binding()?.facade
	}

	/** The outer node is hidden. The base does not know the instance and reads state by name. */
	private readonly _hidden = computed(() => {
		const state: TStateSnapshot = this.state()
		const hidden =
			this._root.hides && (state['rendered'] === false || state['visible'] === false)

		return hidden || this._absent(state) || !this.placed() || !this._above()
	})

	/**
	 * The host's display. Not hidden is `undefined`, not `null`: then Angular
	 * keeps the host's static style, and `null` would remove it.
	 */
	protected readonly _rootDisplay = computed(() =>
		!this._root.hidesRoot && this._hidden() ? 'none' : undefined,
	)

	/**
	 * The template node by its reference (`#root`, `#control`, `#companion`),
	 * `null` without one. The generated surface declares the queries, and only
	 * for references the component's template has: an Angular query copies
	 * itself into every view of the template (an `@if` block, a `@for`
	 * iteration), and without the reference that is memory on every block.
	 */
	protected templateNode(_ref: TTemplateRef): Element | null {
		return null
	}

	/**
	 * Slot templates of the component (`<ng-template slot>`). The query is
	 * declared by the generated surface, and only where the component reads
	 * slots (`slot()`): a content query costs every instance, and an item row
	 * or an icon inside every element of a collection reads none.
	 */
	protected slotTemplates(): readonly SlotDirective[] {
		return NO_SLOTS
	}

	/** The template of a slot by its name from the contract. */
	protected slot(name: string): TemplateRef<unknown> | null {
		return this.slotTemplates().find((slot) => slot.name === name)?.template ?? null
	}

	constructor(
		inputNames: readonly string[],
		outputNames: readonly string[],
		setup: TSetup<TInstance, TFacade, TOutputs, TOwnerFacade>,
		spec: TRootSpec = VIEW_ROOT,
	) {
		this._inputNames = inputNames
		this._setup = setup

		TComponentBase._defineOutputs(new.target.prototype, outputNames)

		const above =
			inject(SubtreeDirective, { skipSelf: true, optional: true })?.present ?? SUBTREE_PRESENT

		this._root = createRoot(spec, {
			own: ['ctrl', ...inputNames],
			state: () => this.state(),
			hidden: this._hidden,
			root: () => this.templateNode('root'),
			control: () => this.templateNode('control'),
			companion: () => this.templateNode('companion'),
		})

		this.placed = this._root.placed
		// Anything else is hidden by its hidden ancestor; `_present` takes the node from the plugins
		this._above = this._root.layer ? above : SUBTREE_PRESENT
		this._present = this._presence(above)

		// The node goes to the plugins and the template only in the browser, after the render
		afterRenderEffect(() => {
			const node = this._root.node()
			const binding = this._binding()

			if (!binding) return

			this._placed = true

			const element = this._present() ? node : null

			binding.bindElement(element)
			this._boundRoot.set(element)
		})

		// The own subtree flag is provided at once: Angular creates the subtree
		// later. `rendered` of the toasts manager removes the region, not the
		// app inside the wrapper
		inject(SubtreeDirective, { self: true }).provide(
			this._root.hidesRoot ? above : this._present,
		)
	}

	ngOnInit(): void {
		// The first ngOnChanges came before the binding: the assembly applies the
		// inputs at mount
		const inputs = this.collectInputs()

		if (this._root.tag !== undefined) inputs['tag'] = this._root.tag

		const binding = runInInjectionContext(this._injector, () => this._setup(this.ctrl, inputs))

		this._eventsCleanup = binding.syncEvents((name) =>
			this._removed() ? undefined : this._createdOutput(name),
		)

		this._binding.set(binding)
	}

	ngOnChanges(changes: SimpleChanges): void {
		const binding = this._binding()

		if (!binding) return

		const inputs: Record<string, unknown> = {}

		for (const key of Object.keys(changes)) {
			inputs[key] = changes[key].currentValue
		}

		binding.syncInputs(inputs)
	}

	ngOnDestroy(): void {
		this._binding()?.detach()
		this._eventsCleanup?.()
		this._binding()?.destroy()
	}

	protected collectInputs(): Record<string, unknown> {
		const inputs: Record<string, unknown> = {}

		for (const name of this._inputNames) {
			const value: unknown = Reflect.get(this, name)
			if (value !== undefined) inputs[name] = value
		}

		return inputs
	}

	/**
	 * The output getters on the prototype of the instance's class, one per
	 * output: the first instance of the class defines them, the next ones find
	 * them there. Not generated code: the getter is the same for every output
	 * but its name, and generated per output it weighed 72 KB on a page of six
	 * components (benchmarks/install/angular.md).
	 */
	private static _defineOutputs(prototype: object, names: readonly string[]): void {
		// The getters are defined all at once, so the first one marks the class
		if (names.length === 0 || Object.hasOwn(prototype, names[0])) return

		for (const name of names) {
			Object.defineProperty(prototype, name, {
				configurable: true,
				get(this: TComponentBase<IEntity>): EventEmitter<unknown> {
					return this.createOutput(name)
				},
			})
		}
	}

	/**
	 * The output's emitter, called by the output's getter on the first read.
	 * The emitter becomes an own property and shadows the getter; a second call
	 * is an error, not a replacement. Created in the injector's context:
	 * `EventEmitter` takes `DestroyRef` from it, and `outputToObservable`
	 * completes with the component.
	 */
	protected createOutput<T>(name: string): EventEmitter<T> {
		const emitter = runInInjectionContext(this._injector, () => new EventEmitter<T>())

		Object.defineProperty(this, name, { value: emitter, enumerable: true })

		return emitter
	}

	/** The root is removed by what removes it under Vue's `v-if`: `rendered=false` and `shownBy`. */
	private _presence(above: Signal<boolean>): Signal<boolean> {
		const { hides, shownBy } = this._root

		if (!hides && shownBy === undefined) return above

		return computed(() => {
			if (!above()) return false

			const state: TStateSnapshot = this.state()

			return !(hides && state['rendered'] === false) && !this._absent(state)
		})
	}

	private _absent(state: TStateSnapshot): boolean {
		const { shownBy } = this._root

		return shownBy !== undefined && state[shownBy] !== true
	}

	/**
	 * Removed from the document: the consumer took the component down, and what
	 * its teardown stirs (the blur of the removed node, the siblings leaving the
	 * collection one by one) is news to no one. Angular destroys a removed
	 * subtree children first, with no hook on the parent before them: `detach`
	 * from `ngOnDestroy` comes after the children. But it takes the subtree out
	 * of the document first, so a placed component that is out of the document
	 * sends nothing, like a Web Components element. On the server the render
	 * does not run, and nothing is muted.
	 */
	private _removed(): boolean {
		const host = this._host

		return (
			this._placed &&
			typeof host === 'object' &&
			host !== null &&
			Reflect.get(host, 'isConnected') === false
		)
	}

	/** An already created emitter; the lookup does not create one. */
	private _createdOutput(name: string): EventEmitter<unknown> | undefined {
		const output: unknown = Object.getOwnPropertyDescriptor(this, name)?.value

		return output instanceof EventEmitter ? output : undefined
	}
}
