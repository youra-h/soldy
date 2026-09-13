import type { ISelect } from '@soldy/core'
import { TSelectKeyboardStrategy } from './base.strategy'
import { isPrintableKey } from './is-printable'
import type { ISelectKeyboardHost } from './types'

/**
 * TSelectOnlyKeyboardStrategy — клавиатура select-only поверх общей части.
 *
 * Добавляет то, что в `editable` принадлежит тексту поля: `Home`/`End`,
 * пробел и набор по буквам.
 */
export class TSelectOnlyKeyboardStrategy extends TSelectKeyboardStrategy {
	protected _extraClosed(e: KeyboardEvent, owner: ISelect, host: ISelectKeyboardHost): void {
		if (e.key === 'Home') {
			e.preventDefault()
			owner.open = true
			host.jumpTo('first')

			return
		}

		if (e.key === 'End') {
			e.preventDefault()
			owner.open = true
			host.jumpTo('last')

			return
		}

		if (e.key === ' ') {
			e.preventDefault()
			owner.open = true
			host.highlightSelected()

			return
		}

		if (isPrintableKey(e)) {
			e.preventDefault()
			owner.open = true
			host.typeaheadTo(e.key)
		}
	}

	protected _extraOpen(e: KeyboardEvent, _owner: ISelect, host: ISelectKeyboardHost): void {
		if (e.key === 'Home') {
			e.preventDefault()
			host.jumpTo('first')

			return
		}

		if (e.key === 'End') {
			e.preventDefault()
			host.jumpTo('last')

			return
		}

		if (e.key === ' ') {
			e.preventDefault()
			host.chooseHighlighted()

			return
		}

		if (isPrintableKey(e)) {
			e.preventDefault()
			host.typeaheadTo(e.key)
		}
	}
}
