import type { ISelect } from '@soldy-ui/core'
import type { ISelectKeyboardHost, ISelectKeyboardStrategy } from './types'

/**
 * TSelectKeyboardStrategy — общая часть клавиатурной модели Select, одна на
 * оба режима `editable`.
 *
 * Здесь то, что не зависит от режима: открытие стрелками/Enter, жест
 * `Alt+↓`/`Alt+↑` из APG, навигация и закрытие открытой панели. Что
 * добавляется поверх — решают `_extraClosed`/`_extraOpen` наследника
 * (`TSelectOnlyKeyboardStrategy`, `TEditableKeyboardStrategy`): режим выражен
 * выбором класса, а не `if (owner.editable)` внутри общего метода.
 */
export abstract class TSelectKeyboardStrategy implements ISelectKeyboardStrategy {
	handleClosed(e: KeyboardEvent, owner: ISelect, host: ISelectKeyboardHost): void {
		if (!owner.openable) return

		if (this._altOpen(e, owner)) return
		if (this._openCommon(e, owner, host)) return

		this._extraClosed(e, owner, host)
	}

	handleOpen(e: KeyboardEvent, owner: ISelect, host: ISelectKeyboardHost): void {
		if (this._navigateOpen(e, owner, host)) return

		this._extraOpen(e, owner, host)
	}

	/** Что режим добавляет к закрытой панели — Home/End/пробел/набор по буквам. */
	protected abstract _extraClosed(
		e: KeyboardEvent,
		owner: ISelect,
		host: ISelectKeyboardHost,
	): void

	/** Что режим добавляет к открытой панели. */
	protected abstract _extraOpen(e: KeyboardEvent, owner: ISelect, host: ISelectKeyboardHost): void

	/**
	 * `Alt+↓` открывает закрытую панель без подсветки — жест APG, одинаковый
	 * в обоих режимах.
	 */
	private _altOpen(e: KeyboardEvent, owner: ISelect): boolean {
		if (!e.altKey || e.key !== 'ArrowDown') return false

		e.preventDefault()
		owner.open = true

		return true
	}

	/**
	 * `ArrowDown`/`ArrowUp`/`Enter` открывают закрытую панель. `↑` встаёт на
	 * последнюю опцию — так пользователь попадает в конец списка одним
	 * нажатием, остальные — на выбранную или на первую.
	 */
	private _openCommon(e: KeyboardEvent, owner: ISelect, host: ISelectKeyboardHost): boolean {
		if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Enter') return false

		e.preventDefault()
		owner.open = true

		if (e.key === 'ArrowUp') {
			host.jumpTo('last')
		} else {
			host.highlightSelected()
		}

		return true
	}

	/**
	 * Открытая панель: стрелки двигают подсветку, `Enter` выбирает,
	 * `Escape`/`Tab` закрывают. `Alt+↑` — второй APG-жест: выбирает
	 * подсвеченное и закрывает, тем же движением, что и `Enter`.
	 */
	private _navigateOpen(e: KeyboardEvent, owner: ISelect, host: ISelectKeyboardHost): boolean {
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault()

				if (host.highlightedUid == null) {
					host.highlightSelected()
				} else {
					host.navigate(1)
				}

				return true

			case 'ArrowUp':
				e.preventDefault()

				if (e.altKey) {
					host.chooseHighlighted()
					owner.open = false
				} else {
					host.navigate(-1)
				}

				return true

			case 'Enter':
				e.preventDefault()
				host.chooseHighlighted()

				return true

			case 'Escape':
				e.preventDefault()
				owner.open = false

				return true

			case 'Tab':
				owner.open = false

				return true
		}

		return false
	}
}
