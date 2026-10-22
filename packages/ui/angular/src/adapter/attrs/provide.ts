/**
 * Рендерер адаптера для приложения: привязки и слушатели на поле, элементе
 * коллекции, ListBox, Tabs, Table и менеджере тостов доходят до их узла внутри.
 * Подключается в `appConfig`, общем у браузера и сервера:
 *
 * ```ts
 * export const appConfig: ApplicationConfig = { providers: [provideAttrs()] }
 * ```
 */

import { makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core'
import { ɵDomRendererFactory2 } from '@angular/platform-browser'
import { TForwardingRendererFactory } from './factory'
import { TForwardRegistry } from './registry'

export function provideAttrs(): EnvironmentProviders {
	return makeEnvironmentProviders([
		TForwardRegistry,
		{ provide: ɵDomRendererFactory2, useClass: TForwardingRendererFactory },
	])
}
