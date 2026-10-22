/**
 * TComponentBase — база Angular-компонента soldy: жизненный цикл связки,
 * выходы, слоты и корень. AGENTS.md (Angular), «Корень-хост ведёт базовый
 * `TComponentBase`».
 *
 * - конструктор: корень по описанию (`TRootSpec`, стратегии в `root/`) и
 *   признак поддерева для потомков;
 * - `ngOnInit`: сборка setup-функцией компонента в контексте его инъекции и
 *   приёмник событий ядра;
 * - `ngOnChanges`: изменённые входы — в ядро;
 * - `ngOnDestroy`: отписка и `destroy()`.
 *
 * Компонент наследует не базу, а сгенерированную `T<Имя>Surface`: она
 * объявляет входы и выходы с их типами для строгого шаблона.
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
	contentChildren,
	inject,
	runInInjectionContext,
	signal,
	viewChild,
	type Signal,
} from '@angular/core'
import type { IEntity } from '@soldy-ui/core'
import type { TStateSnapshot } from '@soldy-ui/setup'
import { createRoot, type TRoot } from './root/strategies'
import type { TRootSpec } from './root/spec'
import { SlotDirective } from './slot.directive'
import { SUBTREE_PRESENT, SubtreeDirective } from './subtree.directive'
import type { TBinding, TBindingState } from './useAdapter'

/** Setup-функция компонента: сборка его контекстов в одну связку. */
export type TSetup<TInstance, TFacade = unknown, TOutputs = unknown, TOwnerFacade = unknown> = (
	ctrl: TInstance | undefined,
	inputs: object,
) => TBinding<TInstance, TFacade, TOutputs, TOwnerFacade>

const VIEW_ROOT: TRootSpec = { strategy: 'view' }

/** Пустое состояние — его база рисует на слое не на своём месте. */
const NO_STATE: TStateSnapshot = Object.freeze({})

@Directive({
	// `hostDirectives` наследник получает, а `providers` — нет
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
	/** Готовый инстанс ядра; нет — сборка создаёт свой. */
	@Input() ctrl?: TInstance

	private readonly _inputNames: readonly string[]
	private readonly _setup: TSetup<TInstance, TFacade, TOutputs, TOwnerFacade>
	private readonly _root: TRoot

	/** Поддерево предка есть — им прячется только слой, увезённый из поддерева. */
	private readonly _above: Signal<boolean>

	/** Корень есть — там, где у Vue его не снял бы `v-if`. */
	private readonly _present: Signal<boolean>

	/** Корень там, где ему место: у слоя — в цели или на месте, у остальных — всегда. */
	protected readonly placed: Signal<boolean>

	private readonly _binding = signal<
		TBinding<TInstance, TFacade, TOutputs, TOwnerFacade> | undefined
	>(undefined)
	private _eventsCleanup?: () => void

	private readonly _boundRoot = signal<Element | null>(null)

	/** Узел, который база отдала `TElementPlugin`: `null` на сервере, до отрисовки и у снятого корня. */
	protected readonly rootElement: Signal<Element | null> = this._boundRoot.asReadonly()

	/** В его контексте заводятся эмиттеры и идёт сборка. */
	private readonly _injector = inject(Injector)

	/** Состояние ядра с выходами плагинов и свойствами фасадов. */
	readonly state = computed<TBindingState<TInstance, TFacade, TOutputs, TOwnerFacade>>(
		() => this._binding()?.state() ?? {},
	)

	protected readonly instance = computed<TInstance | undefined>(() => this._binding()?.ctrl)

	/** Фасад коллекции: через его контекст шаблон зовёт команды коллекции. */
	protected readonly facade = computed<TFacade | undefined>(() => this._binding()?.facade)

	private readonly _drawn = computed<TStateSnapshot>(() =>
		this.placed() ? this.state() : NO_STATE,
	)

	/** Внешний узел скрыт. Инстанса база не знает и читает состояние по именам. */
	private readonly _hidden = computed(() => {
		const state: TStateSnapshot = this.state()
		const hidden =
			this._root.hides && (state['rendered'] === false || state['visible'] === false)

		return hidden || this._absent(state) || !this.placed() || !this._above()
	})

	/**
	 * Скрытие хоста. Не скрыт — `undefined`, а не `null`: так Angular берёт
	 * статику хоста, а `null` сняла бы её.
	 */
	protected readonly _rootDisplay = computed(() =>
		!this._root.hidesRoot && this._hidden() ? 'none' : undefined,
	)

	// Сигнальные запросы — полями: в методе компилятор роняет AOT (NG8110).
	// `read` задан, иначе `nativeElement` был бы `any`
	private readonly _rootQuery = viewChild<unknown, ElementRef<Element>>('root', {
		read: ElementRef,
	})
	private readonly _controlQuery = viewChild<unknown, ElementRef<Element>>('control', {
		read: ElementRef,
	})
	private readonly _companionQuery = viewChild<unknown, ElementRef<Element>>('companion', {
		read: ElementRef,
	})

	private readonly _slots = contentChildren(SlotDirective)

	/** Шаблон слота по имени из контракта. */
	protected slot(name: string): TemplateRef<unknown> | null {
		return this._slots().find((slot) => slot.name === name)?.template ?? null
	}

	constructor(
		inputNames: readonly string[],
		setup: TSetup<TInstance, TFacade, TOutputs, TOwnerFacade>,
		spec: TRootSpec = VIEW_ROOT,
	) {
		this._inputNames = inputNames
		this._setup = setup

		const above =
			inject(SubtreeDirective, { skipSelf: true, optional: true })?.present ?? SUBTREE_PRESENT

		this._root = createRoot(spec, {
			own: ['ctrl', ...inputNames],
			state: this.state,
			drawn: this._drawn,
			hidden: this._hidden,
			root: () => this._rootQuery()?.nativeElement ?? null,
			control: () => this._controlQuery()?.nativeElement ?? null,
			companion: () => this._companionQuery()?.nativeElement ?? null,
		})

		this.placed = this._root.placed
		// Остальных прячет спрятанный предок, а узел у плагинов снимает `_present`
		this._above = this._root.layer ? above : SUBTREE_PRESENT
		this._present = this._presence(above)

		// Узел — плагинам и шаблону только в браузере, после отрисовки
		afterRenderEffect(() => {
			const node = this._root.node()
			const binding = this._binding()

			if (!binding) return

			const element = this._present() ? node : null

			binding.bindElement(element)
			this._boundRoot.set(element)
		})

		// Признак своего поддерева — сразу: поддерево Angular создаёт позже.
		// `rendered` менеджера тостов снимает регион, а не приложение в обёртке
		inject(SubtreeDirective, { self: true }).provide(
			this._root.hidesRoot ? above : this._present,
		)
	}

	ngOnInit(): void {
		// Первый ngOnChanges пришёл раньше связки: входы при монтировании
		// применяет сборка
		const inputs = this.collectInputs()

		if (this._root.tag !== undefined) inputs['tag'] = this._root.tag

		const binding = runInInjectionContext(this._injector, () => this._setup(this.ctrl, inputs))

		this._eventsCleanup = binding.syncEvents((name) => this._createdOutput(name))

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
	 * Эмиттер выхода — зовёт геттер `T<Имя>Surface` при первом чтении. Эмиттер
	 * становится собственным свойством и заслоняет геттер; повторный вызов —
	 * ошибка, а не подмена. В контексте инжектора: `EventEmitter` берёт из него
	 * `DestroyRef`, и `outputToObservable` завершается вместе с компонентом.
	 */
	protected createOutput<T>(name: string): EventEmitter<T> {
		const emitter = runInInjectionContext(this._injector, () => new EventEmitter<T>())

		Object.defineProperty(this, name, { value: emitter, enumerable: true })

		return emitter
	}

	/** Снимает корень то же, что у Vue `v-if`: `rendered=false` и `shownBy`. */
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

	/** Уже заведённый эмиттер; поиск его не заводит. */
	private _createdOutput(name: string): EventEmitter<unknown> | undefined {
		const output: unknown = Object.getOwnPropertyDescriptor(this, name)?.value

		return output instanceof EventEmitter ? output : undefined
	}
}
