import { isEventSource } from '@soldy-ui/core'
import type { IPluginContext } from '../../base'
import type { IOverlayOpenOptions, IOverlayOpenState } from './types'

/** Свойство открытости по умолчанию — см. `IOverlayOpenOptions.property`. */
const DEFAULT_PROPERTY = 'open'

/**
 * Связывает плагин оверлея с открытостью владельца: читает её, пишет обратно
 * и зовёт `onChange` на каждом изменении.
 *
 * Открытость плагины слоя ведут сами, а не `watch` в адаптере: связка
 * «открыто ⇄ работаем» одинакова у всех шести адаптеров, и повторять её в
 * шаблоне каждого значило бы поменять в одном и забыть в пяти. Привязка одна
 * на все плагины слоя, `TDismissPlugin` в их числе: правило записано только
 * здесь.
 *
 * Владелец берётся рефлексией, а не интерфейсом ядра: у модального оверлея
 * класса ядра ещё нет, а требовать от владельца конкретный тип ради одного
 * булева свойства значило бы придумать его заранее.
 *
 * Подписка живёт на шине владельца, а владелец бывает долговечнее плагина:
 * свой `ctrl` приложения переживает перемонтирование, и каждое монтирование
 * ставит ему новый набор. Поэтому привязка снимает свою подписку сама
 * (`unbind`) — обработчиком, который сама же и повесила, — а плагин зовёт это
 * в `destroy()`. Иначе на владельце копились бы обработчики уничтоженных
 * плагинов.
 *
 * `null` — привязки нет: владельца нет, `property: null` или такого свойства
 * у владельца не объявлено.
 */
export function bindOverlayOpen(
	ctx: IPluginContext,
	options: IOverlayOpenOptions | undefined,
	onChange: (open: boolean) => void,
): IOverlayOpenState | null {
	const instance = ctx.getInstance<object>()
	const property = options?.property === undefined ? DEFAULT_PROPERTY : options.property

	if (!instance || !property || !(property in instance)) return null

	const read = (): boolean => !!Reflect.get(instance, property)
	const events: unknown = Reflect.get(instance, 'events')
	const source = isEventSource(events) ? events : null
	const event = options?.event ?? `change:${property}`
	const handler = (): void => onChange(read())

	source?.on(event, handler)

	return {
		read,
		write(value: boolean): void {
			Reflect.set(instance, property, value)
		},
		unbind(): void {
			source?.off(event, handler)
		},
	}
}
