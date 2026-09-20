/**
 * defineComponent — дескриптор компонента из его объявления.
 *
 * Дескриптор — описание типа и только оно: что компонент объявляет наружу и из
 * каких плагинов состоит (`TComponentDescriptor`). Собирает по нему компонент
 * сборка (`assemble/`), дескриптор о ней не знает.
 *
 * Типы дескриптора руками не пишутся — `defineComponent` выводит их из опций
 * (`TContractFrom`). Пропсы — у класса ядра: его инстанс и есть схема для типов,
 * без своего `ctor` — у родительского. События — карта того же класса, суженная
 * до имён, которые дескриптор публикует: `events` и триггеры пропсов, свои и
 * `extends`. Слоты — из объявления `slots` поверх слотов `extends`, плагины —
 * из `plugins`. Второй записи пропсов, событий или слотов рядом с объявлением
 * нет.
 */

import { TComponentDescriptor } from './component-descriptor.class'
import type { TCheckedEventNames, TContractFrom } from './inference.types'
import type { IComponentDescriptor, IComponentOptions } from './types'

/**
 * Параметр типа один — сами опции, и явно его не передают. `const`: опции
 * запоминаются литералом, иначе имена событий, триггеров и слотов вывелись бы
 * `string`, а неймспейсы плагинов пропали бы из типов адаптеров.
 *
 * Имена событий сверяются с картой событий инстанса (`TCheckedEventNames`).
 */
export function defineComponent<const TOptions extends IComponentOptions>(
	options: TOptions & TCheckedEventNames<TOptions>,
): IComponentDescriptor<TContractFrom<TOptions>>

/** Тело — под сигнатурой без контракта: рантайму он не нужен (см. `TComponentDescriptor`). */
export function defineComponent(options: IComponentOptions): IComponentDescriptor {
	return new TComponentDescriptor(options)
}
