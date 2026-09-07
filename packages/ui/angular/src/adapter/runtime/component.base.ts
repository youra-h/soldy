/**
 * TComponentBase — абстрактный базовый класс Angular-компонента soldy.
 *
 * Выносит общий жизненный цикл, чтобы убрать дублирование между компонентами:
 *
 * - constructor: создаёт EventEmitter'ы для всех имён из outputNames
 * - state: сигнал состояния Core (шаблон подписывается сам, без ChangeDetectorRef)
 * - ngOnInit: создаёт binding (createBinding) и подписывает outputs
 * - ngOnChanges: пробрасывает изменённые inputs в Core (syncInputs)
 * - ngOnDestroy: очищает подписки и adapter.destroy()
 *
 * Подкласс обязан реализовать:
 * - createBinding(ctrl, inputs): создаёт TBinding через setup-функцию
 * - super(inputNames, outputNames) в конструкторе: имена инпутов/аутпутов
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
	signal,
	type Signal,
} from '@angular/core'
import type { IEntity } from '@soldy/core'
import { SlotDirective } from './slot.directive'
import type { TBinding } from './useAdapter'

@Directive({ standalone: true })
export abstract class TComponentBase<TInstance extends IEntity>
	implements OnInit, OnChanges, OnDestroy
{
	/** Готовый core-инстанс (если не передан, создаётся из ctor дескриптора). */
	@Input() ctrl?: TInstance

	protected abstract createBinding(
		ctrl: TInstance | undefined,
		inputs: Record<string, any>,
	): TBinding<TInstance>

	private readonly _inputNames: readonly string[]
	private readonly _outputNames: readonly string[]
	private readonly _binding = signal<TBinding<TInstance> | undefined>(undefined)
	private _eventsCleanup?: () => void

	/** Состояние Core. Сигнал, т.к. binding появляется только в ngOnInit. */
	readonly state = computed<Record<string, any>>(() => this._binding()?.state() ?? {})

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

	constructor(inputNames: readonly string[], outputNames: readonly string[]) {
		this._inputNames = inputNames
		this._outputNames = outputNames

		for (const name of outputNames) {
			;(this as any)[name] = new EventEmitter()
		}
	}

	ngOnInit(): void {
		const binding = this.createBinding(this.ctrl, this.collectInputs())

		this._eventsCleanup = binding.syncEvents(this._collectOutputs())

		this._binding.set(binding)
	}

	ngOnChanges(changes: SimpleChanges): void {
		const binding = this._binding()

		if (!binding) return

		const inputs: Record<string, any> = {}

		for (const key of Object.keys(changes)) {
			inputs[key] = changes[key].currentValue
		}

		binding.syncInputs(inputs)
	}

	ngOnDestroy(): void {
		this._eventsCleanup?.()
		this._binding()?.destroy()
	}

	protected collectInputs(): Record<string, any> {
		const inputs: Record<string, any> = {}

		for (const name of this._inputNames) {
			const value = (this as any)[name]
			if (value !== undefined) inputs[name] = value
		}

		return inputs
	}

	/** Разовая привязка — для компонентов, чей корень существует всегда (хост). */
	protected bindElement(el: HTMLElement | null): void {
		this._binding()?.bindElement(el)
	}

	/**
	 * Связывает DOM-элемент с TElementPlugin и переустанавливает связь, когда
	 * элемент пересоздаётся — при переключении `rendered` или смене `tag`
	 * Angular уничтожает старую ноду и создаёт новую.
	 *
	 * Принимает сигнальный viewChild(), а не ElementRef: обычный @ViewChild
	 * читается один раз в ngAfterViewInit и после пересоздания указывает
	 * на мёртвый узел. Вызывать из конструктора подкласса (нужен injection context).
	 */
	protected bindElementFrom(element: Signal<ElementRef | undefined>): void {
		effect(() => {
			const binding = this._binding()
			const ref = element()

			if (!binding) return

			binding.bindElement(ref?.nativeElement ?? null)
		})
	}

	private _collectOutputs(): Record<string, EventEmitter<any>> {
		const outputs: Record<string, EventEmitter<any>> = {}

		for (const name of this._outputNames) {
			outputs[name] = (this as any)[name]
		}

		return outputs
	}
}
