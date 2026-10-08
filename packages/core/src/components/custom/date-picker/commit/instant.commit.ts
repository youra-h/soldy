import type { IDatePickerCommit, IDatePickerCommitHost } from './types'

/**
 * Фиксация сразу — по умолчанию. Правка календаря тут же становится
 * значением DatePicker, а выбор пользователя закрывает панель при
 * `closeOnSelect` — в диапазоне вторым днём. Закрытие панели значения не
 * трогает: календарь и так показывает значение DatePicker.
 */
export class TInstantCommit implements IDatePickerCommit {
	private readonly _host: IDatePickerCommitHost

	constructor(host: IDatePickerCommitHost) {
		this._host = host
	}

	edit(): void {
		this._host.accept()
	}

	choose(): void {
		this._host.closeAfterChoice()
	}

	close(): void {
		// Черновика нет: календарь показывает значение DatePicker
	}
}
