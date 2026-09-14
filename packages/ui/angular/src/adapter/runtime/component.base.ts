/**
 * TComponentBase — абстрактный базовый класс Angular-компонента soldy.
 *
 * Выносит общий жизненный цикл, чтобы убрать дублирование между компонентами:
 *
 * - constructor: создаёт EventEmitter'ы для всех имён из outputNames и
 *   связывает корневой DOM-элемент с TElementPlugin (см. `_bindRoot`)
 * - state: сигнал состояния Core (шаблон подписывается сам, без ChangeDetectorRef)
 * - ngOnInit: создаёт binding (createBinding) и подписывает outputs
 * - ngOnChanges: пробрасывает изменённые inputs в Core (syncInputs)
 * - ngOnDestroy: очищает подписки и adapter.destroy()
 *
 * Подкласс обязан реализовать:
 * - createBinding(ctrl, inputs): создаёт TBinding через setup-функцию
 * - super(inputNames, outputNames, rootStrategy?) в конструкторе: имена
 *   инпутов/аутпутов и стратегия привязки корня — `'view'` (по умолчанию),
 *   когда корень живёт внутри `@if`/`@else` и шаблон помечает его `#root`, или
 *   `'host'`, когда корень — сам хост-элемент компонента.
 *
 * inputNames и outputNames передаются через конструктор (а не getter), т.к.
 * они нужны уже в конструкторе (создание EventEmitter'ов), а TS запрещает
 * обращение к абстрактному свойству в конструкторе.
 */

import {
	Directive,
	ElementRef,
	EventEmitter,
	Input,
	OnChanges,
	OnDestroy,
	OnInit,
	SimpleChanges,
	TemplateRef,
	computed,
	contentChildren,
	effect,
	inject,
	signal,
	viewChild,
} from '@angular/core'
import type { IEntity } from '@soldy/core'
import type { TInstanceState } from '@soldy/setup'
import { SlotDirective } from './slot.directive'
import type { TBinding } from './useAdapter'

/**
 * Стратегия привязки корневого DOM-элемента к TElementPlugin.
 *
 * - `'view'` — корень существует не всегда (живёт внутри `@if`, может
 *   пересоздаваться при смене `tag`): сигнальный `viewChild('root')`
 *   переустанавливает связь при каждой пересоздании узла.
 * - `'host'` — корень существует всё время жизни компонента: привязка
 *   разовая, через инжектированный `ElementRef` хоста.
 */
export type TRootStrategy = 'view' | 'host'

@Directive({ standalone: true })
export abstract class TComponentBase<TInstance extends IEntity>
	implements OnInit, OnChanges, OnDestroy
{
	/** Готовый core-инстанс (если не передан, создаётся из ctor дескриптора). */
	@Input() ctrl?: TInstance

	protected abstract createBinding(
		ctrl: TInstance | undefined,
		inputs: object,
	): TBinding<TInstance>

	private readonly _inputNames: readonly string[]
	private readonly _outputNames: readonly string[]
	private readonly _binding = signal<TBinding<TInstance> | undefined>(undefined)
	private _eventsCleanup?: () => void

	/** Состояние Core. Сигнал, т.к. binding появляется только в ngOnInit. */
	readonly state = computed<TInstanceState<TInstance>>(() => this._binding()?.state() ?? {})

	/** Объявленные потребителем `<ng-template slot="...">`. */
	private readonly _slots = contentChildren(SlotDirective)

	/**
	 * Шаблон scoped-слота по имени из контракта.
	 *
	 * Сигнальный запрос, а не @ContentChildren: результат читается прямо из
	 * шаблона, и обычный запрос не уведомил бы об изменении.
	 */
	protected slot(name: string): TemplateRef<unknown> | null {
		return this._slots().find((slot) => slot.name === name)?.template ?? null
	}

	constructor(
		inputNames: readonly string[],
		outputNames: readonly string[],
		rootStrategy: TRootStrategy = 'view',
	) {
		this._inputNames = inputNames
		this._outputNames = outputNames

		for (const name of outputNames) {
			Reflect.set(this, name, new EventEmitter())
		}

		this._bindRoot(rootStrategy)
	}

	ngOnInit(): void {
		const binding = this.createBinding(this.ctrl, this.collectInputs())

		this._eventsCleanup = binding.syncEvents(this._collectOutputs())

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
	 * Связывает корневой DOM-элемент с TElementPlugin по выбранной стратегии.
	 * Вызывается из конструктора — обеим стратегиям нужен injection context.
	 */
	private _bindRoot(strategy: TRootStrategy): void {
		if (strategy === 'host') {
			const elementRef = inject(ElementRef)

			effect(() => {
				this._binding()?.bindElement(elementRef.nativeElement)
			})

			return
		}

		// Сигнальный viewChild(), а не @ViewChild: обычный запрос читается
		// один раз в ngAfterViewInit и после пересоздания узла (смена `tag`,
		// переключение `rendered`) указывает на мёртвый элемент.
		const root = viewChild('root', { read: ElementRef })

		effect(() => {
			const binding = this._binding()
			const ref = root()

			if (!binding) return

			binding.bindElement(ref?.nativeElement ?? null)
		})
	}

	private _collectOutputs(): Record<string, EventEmitter<unknown>> {
		const outputs: Record<string, EventEmitter<unknown>> = {}

		for (const name of this._outputNames) {
			const output: unknown = Reflect.get(this, name)

			if (output instanceof EventEmitter) outputs[name] = output
		}

		return outputs
	}
}
