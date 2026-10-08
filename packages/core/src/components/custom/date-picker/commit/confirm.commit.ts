import type { IDatePickerCommit, IDatePickerCommitHost } from './types'

/**
 * Фиксация по «OK» (`confirmable`). Выбор в календаре — черновик, и хранит
 * его сам календарь: второй копии значения нет. Выбор пользователя панель не
 * закрывает — `closeOnSelect` здесь не действует. Значением черновик
 * становится только по `confirm()` DatePicker, а любое закрытие панели —
 * «Отмена», Escape, нажатие мимо, жест, `open = false` — возвращает
 * календарю значение DatePicker.
 */
export class TConfirmCommit implements IDatePickerCommit {
	private readonly _host: IDatePickerCommitHost

	constructor(host: IDatePickerCommitHost) {
		this._host = host
	}

	edit(): void {
		// Правка — черновик: она остаётся в календаре до «OK»
	}

	choose(): void {
		// Выбор панель не закрывает: закрывают «OK» и «Отмена»
	}

	close(): void {
		this._host.reset()
	}
}
