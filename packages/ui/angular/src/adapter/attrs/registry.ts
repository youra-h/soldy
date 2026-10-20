/**
 * Реестр хостов, которые отдают написанное на них внутреннему узлу: хост →
 * его запись (`TForwardedHost`).
 *
 * Регистрирует хост база компонента (`TComponentBase`) — у поля, элемента
 * коллекции, ListBox, Tabs (`TRootSpec.control`) и таблицы (`'wrapped'`), — а
 * читает рендерер адаптера (`TForwardingRenderer`): команду рендереру на
 * зарегистрированный хост он отдаёт его записи. Реестр — у приложения
 * (`provideAttrs()`): сервер рисует каждый запрос своим приложением, и хосты
 * запросов не смешиваются.
 *
 * Найденный реестр ещё не значит, что рендерер подменён: `provideAttrs()` в
 * провайдерах маршрута или компонента реестр даст, а рендерер приложения не
 * подменит. Поэтому подменённый рендерер берёт реестр в работу (`serve`), а
 * база проверяет именно это (`served`): без подмены статические атрибуты
 * переносились бы, а привязки и слушатели молча оставались на корне.
 */

import { Injectable } from '@angular/core'
import { TForwardedHost } from './host'

@Injectable()
export class TForwardRegistry {
	/** Хост → запись; ключ — элемент, а рендерер спрашивает о любой цели команды. */
	private readonly _hosts = new WeakMap<object, TForwardedHost>()

	private _served = false

	/** Рендерер адаптера взял реестр в работу: подмена стоит в приложении. */
	get served(): boolean {
		return this._served
	}

	/** Взять реестр в работу — зовёт рендерер адаптера, когда его создаёт приложение. */
	serve(): this {
		this._served = true

		return this
	}

	/**
	 * Хост с внутренним узлом. `own` — имена входов компонента и `ctrl`: такие
	 * атрибуты остаются на хосте. Снятый с реестра (`release` записи), хост
	 * снова пишется сам.
	 */
	register(host: Element, own: Iterable<string>): TForwardedHost {
		const names = new Set([...own].map((name) => name.toLowerCase()))
		const forwarded: TForwardedHost = new TForwardedHost(names, () => {
			if (this._hosts.get(host) === forwarded) this._hosts.delete(host)
		})

		this._hosts.set(host, forwarded)

		return forwarded
	}

	/** Запись хоста — цели команды рендереру; не хост — `undefined`. */
	hostOf(target: unknown): TForwardedHost | undefined {
		return typeof target === 'object' && target !== null ? this._hosts.get(target) : undefined
	}
}
