import { isEventSource } from '@soldy-ui/core'
import type { IPluginContext } from '../../base'
import type { IOverlayOpenOptions, IOverlayOpenState } from './types'

/** Свойство открытости по умолчанию — то же, что у `TDismissPlugin`. */
const DEFAULT_PROPERTY = 'open'

/**
 * Связывает плагин оверлея с открытостью владельца: читает её, пишет обратно
 * и зовёт `onChange` на каждом изменении.
 *
 * Открытость плагины слоя ведут сами, а не `watch` в адаптере: связка
 * «открыто ⇄ работаем» одинакова у всех шести адаптеров, и повторять её в
 * шаблоне каждого значило бы поменять в одном и забыть в пяти. Тем же
 * способом её ведёт `TDismissPlugin`.
 *
 * Владелец берётся рефлексией, а не интерфейсом ядра: у модального оверлея
 * класса ядра ещё нет, а требовать от владельца конкретный тип ради одного
 * булева свойства значило бы придумать его заранее.
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

	if (isEventSource(events)) {
		events.on(options?.event ?? `change:${property}`, () => onChange(read()))
	}

	return {
		read,
		write(value: boolean): void {
			Reflect.set(instance, property, value)
		},
	}
}
