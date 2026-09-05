/**
 * TAngularComponentBase — абстрактный базовый класс Angular-компонента soldy.
 *
 * Выносит общий жизненный цикл, чтобы убрать дублирование между компонентами:
 *
 * - constructor: создаёт EventEmitter'ы для всех имён из outputNames
 * - state getter: текущее состояние из TAngularBinding
 * - ngOnInit: создаёт binding (createBinding) и подписывает outputs
 * - ngOnChanges: пробрасывает изменённые inputs в Core (syncInputs)
 * - ngOnDestroy: очищает подписки и adapter.destroy()
 *
 * Подкласс обязан реализовать:
 * - createBinding(ctrl, inputs, cdr): создаёт TAngularBinding через setup-функцию
 * - super(inputNames, outputNames) в конструкторе: имена инпутов/аутпутов
 *
 * inputNames и outputNames передаются через конструктор (а не getter), т.к.
 * они нужны уже в конструкторе (создание EventEmitter'ов), а TS запрещает
 * обращение к абстрактному свойству в конструкторе.
 */

import {
	ChangeDetectorRef,
	EventEmitter,
	Input,
	OnChanges,
	OnDestroy,
	OnInit,
	SimpleChanges,
	inject,
} from '@angular/core'
import type { IEntity } from '@soldy/core'
import type { TAngularBinding } from './useAdapter'

export abstract class TAngularComponentBase<TInstance extends IEntity>
	implements OnInit, OnChanges, OnDestroy
{
	/** Готовый core-инстанс (если не передан, создаётся из ctor дескриптора). */
	@Input() ctrl?: TInstance

	protected abstract createBinding(
		ctrl: TInstance | undefined,
		inputs: Record<string, any>,
		cdr: ChangeDetectorRef,
	): TAngularBinding<TInstance>

	private readonly _inputNames: readonly string[]
	private readonly _outputNames: readonly string[]
	private _binding?: TAngularBinding<TInstance>
	private _eventsCleanup?: () => void
	private readonly _cdr = inject(ChangeDetectorRef)

	constructor(inputNames: readonly string[], outputNames: readonly string[]) {
		this._inputNames = inputNames
		this._outputNames = outputNames

		for (const name of outputNames) {
			;(this as any)[name] = new EventEmitter()
		}
	}

	get state(): Record<string, any> {
		return this._binding?.state ?? {}
	}

	ngOnInit(): void {
		this._binding = this.createBinding(this.ctrl, this.collectInputs(), this._cdr)
		this._eventsCleanup = this._binding.syncEvents(this._collectOutputs())
	}

	ngOnChanges(changes: SimpleChanges): void {
		if (!this._binding) return

		const inputs: Record<string, any> = {}

		for (const key of Object.keys(changes)) {
			inputs[key] = changes[key].currentValue
		}

		this._binding.syncInputs(inputs)
	}

	ngOnDestroy(): void {
		this._eventsCleanup?.()
		this._binding?.destroy()
	}

	protected collectInputs(): Record<string, any> {
		const inputs: Record<string, any> = {}

		for (const name of this._inputNames) {
			const value = (this as any)[name]
			if (value !== undefined) inputs[name] = value
		}

		return inputs
	}

	/** Привязывает DOM-элемент к TElementPlugin (для DOM-компонентов, AfterViewInit). */
	protected bindElement(el: HTMLElement | null): void {
		this._binding?.bindElement(el)
	}

	private _collectOutputs(): Record<string, EventEmitter<any>> {
		const outputs: Record<string, EventEmitter<any>> = {}

		for (const name of this._outputNames) {
			outputs[name] = (this as any)[name]
		}

		return outputs
	}
}
