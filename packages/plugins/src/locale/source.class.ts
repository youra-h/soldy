import { TEvented } from '@soldy-ui/core'
import type { ILocaleSource, TLocale, TLocaleSourceEvents } from './types'

/**
 * TLocaleSource — локаль одного поддерева: текущее значение и его смена.
 *
 * Создаёт его провайдер адаптера — по источнику на провайдер, а не один на
 * процесс: сервер рисует параллельные запросы каждый на своём языке, а
 * вложенный провайдер даёт поддереву свой. Адаптер отдаёт источник сборке
 * (`createAdapterContext`, опция `locale`), а сборка — набору плагинов
 * (`IPluginContext.locale`). Плагины читают локаль при установке и
 * подписываются на смену — компонент не перемонтируется.
 *
 * Набор без провайдера получает свой источник с английской локалью.
 */
export class TLocaleSource implements ILocaleSource {
	readonly events = new TEvented<TLocaleSourceEvents>()

	constructor(private _locale: TLocale) {}

	get locale(): TLocale {
		return this._locale
	}

	/** Та же локаль — ничего не меняет. */
	set locale(value: TLocale) {
		if (this._locale === value) return

		this._locale = value
		this.events.emit('change', value)
	}
}
