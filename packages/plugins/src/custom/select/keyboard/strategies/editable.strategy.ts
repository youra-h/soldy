import type { ISelect } from '@soldy-ui/core'
import { TSelectKeyboardStrategy } from './base.strategy'
import type { ISelectKeyboardHost } from './types'

/**
 * TEditableKeyboardStrategy — клавиатура `editable` поверх общей части.
 *
 * `Home`/`End`, пробел и печатные символы не перехватываются вовсе — они
 * принадлежат тексту поля. Единственное добавление — `Escape` на уже
 * закрытой панели: сам он ничего не открывает и не выбирает, а сообщает
 * событием, что дальше решает `TEditablePlugin` (двойной Escape и возврат
 * текста, см. `AGENTS.md`).
 */
export class TEditableKeyboardStrategy extends TSelectKeyboardStrategy {
	protected _extraClosed(e: KeyboardEvent, _owner: ISelect, host: ISelectKeyboardHost): void {
		if (e.key !== 'Escape') return

		host.emitClosedEscape()
	}

	protected _extraOpen(): void {
		// Home/End/пробел/печатные символы принадлежат тексту поля — здесь
		// добавлять нечего
	}
}
