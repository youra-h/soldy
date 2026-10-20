/**
 * `provideAttrs()` — подключение рендерера адаптера: всё, что потребитель
 * пишет на компонент, доходит до узла, к которому относится.
 *
 * ```ts
 * export const appConfig: ApplicationConfig = {
 * 	providers: [provideAttrs()],
 * }
 * ```
 *
 * У поля, элемента коллекции, ListBox, Tabs и таблицы написанное на
 * компоненте относится к узлу внутри — `<input>`, строке, узлу списка,
 * `table`, — как атрибуты снаружи у Vue и React. Статические атрибуты
 * разметки туда переносит база компонента, а привязки (`[attr.x]`,
 * `[aria-label]`, `[title]`) и слушатели (`(focus)`, `(blur)`) Angular отдаёт
 * рендереру шаблона потребителя, и доносит их только подменённый рендерер.
 * Поэтому провайдер обязателен: без него эти компоненты бросают ошибку, а не
 * работают наполовину. Подключает его приложение — в `appConfig`, общий у
 * браузера и сервера: в провайдерах маршрута или компонента рендерер
 * приложения он не подменит.
 *
 * С набором ядра `attrs` (`TComponentView`) не связан: тот — нативные
 * атрибуты корня, которые пишет ядро.
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
