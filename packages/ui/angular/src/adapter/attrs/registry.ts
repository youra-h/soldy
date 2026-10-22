/**
 * Реестр хостов приложения: хост → запись (`TForwardedHost`). Регистрирует
 * база компонента, читают рендерер адаптера, директива набора и сами записи.
 *
 * `served` — рендерер приложения подменён: `provideAttrs()` в провайдерах
 * маршрута реестр даст, а рендерер не подменит.
 */

import { Injectable } from '@angular/core'
import { TForwardedHost, type TForwardOptions } from './host'

@Injectable()
export class TForwardRegistry {
	private readonly _hosts = new WeakMap<object, TForwardedHost>()
	private _served = false

	get served(): boolean {
		return this._served
	}

	/** Зовёт фабрика рендереров адаптера, когда её создаёт приложение. */
	serve(): this {
		this._served = true

		return this
	}

	/** `own` — имена входов и `ctrl`: такие атрибуты остаются на хосте. */
	register(host: Element, own: Iterable<string>, options: TForwardOptions = {}): TForwardedHost {
		const names = new Set([...own].map((name) => name.toLowerCase()))
		const forwarded: TForwardedHost = new TForwardedHost(
			names,
			options.boxless ?? false,
			(node) => this.hostOf(node),
			() => {
				if (this._hosts.get(host) === forwarded) this._hosts.delete(host)
			},
		)

		this._hosts.set(host, forwarded)

		return forwarded
	}

	hostOf(target: unknown): TForwardedHost | undefined {
		return typeof target === 'object' && target !== null ? this._hosts.get(target) : undefined
	}
}
