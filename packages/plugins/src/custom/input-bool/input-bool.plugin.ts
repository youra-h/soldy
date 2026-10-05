import type { ICheckBox } from '@soldy-ui/core'
import { TBasePlugin } from '../../base'
import type { IPluginContext } from '../../base'
import { TElementPlugin } from '../element'
import type { TInputBoolPluginEvents } from './types'

export class TInputBoolPlugin extends TBasePlugin<any, TInputBoolPluginEvents> {
	private _input: HTMLInputElement | null = null
	private _instance: ICheckBox | null = null
	private _onClick = this._handleClick.bind(this)
	private _onChange = this._handleChange.bind(this)

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		const elementPlugin = ctx.get(TElementPlugin)

		elementPlugin?.events.on('ready', () => {
			const el = elementPlugin.element
			if (!el) return

			const input = el.querySelector<HTMLInputElement>('input')
			if (!input) return

			this._input = input
			input.addEventListener('click', this._onClick)
			input.addEventListener('change', this._onChange)
		})

		elementPlugin?.events.on('removed', () => {
			this._removeInputListener()
			this._input = null
		})

		this._instance = ctx.getInstance<ICheckBox>()
	}

	override destroy(): void {
		this._removeInputListener()
		this._input = null
		this._instance = null
		super.destroy()
	}

	/**
	 * Readonly отменяется на `click`, а не на `change`: `checked` и
	 * `indeterminate` браузер переключает до клика и откатывает, только если
	 * отменён сам клик. `change` уже не отменить — DOM разошёлся бы с моделью.
	 * Пробел на сфокусированном чекбоксе тоже приходит кликом.
	 */
	private _handleClick(event: Event): void {
		if (this._instance?.readonly) event.preventDefault()
	}

	private _handleChange(): void {
		if (this._instance?.readonly || this._input?.disabled) return

		this._instance?.toggle()
		this._syncInput()
		this.events.emit('change:value', { value: this._instance?.value })
	}

	/**
	 * Узел — по модели после переключения. Браузер переключил поле сам, ещё до
	 * клика, а модель вправе запись не принять: её отменил или поправил
	 * подписчик `change:value:before` — так, например, чекбокс выбора строки
	 * таблицы отдаёт решение выбору строк. Модель тогда не сменилась, и
	 * разметка поле не перерисует: и Vue, и React пишут `checked` в узел только
	 * на смену своего значения. Без этой записи поле осталось бы переключённым
	 * при прежней модели.
	 */
	private _syncInput(): void {
		const input = this._input
		const instance = this._instance

		if (!input || !instance) return

		input.checked = instance.value === true
		input.indeterminate = instance.indeterminate === true
	}

	private _removeInputListener(): void {
		if (this._input) {
			this._input.removeEventListener('click', this._onClick)
			this._input.removeEventListener('change', this._onChange)
		}
	}
}
