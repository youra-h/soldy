import { isCloseRequestable, isEventSource } from '@soldy-ui/core'
import type { IPluginContext } from '../../base'
import type { IOverlayOpenOptions, IOverlayOpenState, TOverlayOpenListen } from './types'

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
 * Закрытие, которое решил пользователь (`close`), — здесь же: владельца,
 * который принимает запрос закрытия (`isCloseRequestable`), плагины
 * закрывают запросом с причиной, остальных — записью. Решать, закрываться ли
 * по нажатию мимо и Escape, — дело владельца: модальное окно может
 * закрываться только кнопкой, а подписчик — отменить закрытие.
 *
 * Владелец берётся рефлексией, а не интерфейсом ядра: требовать от владельца
 * конкретный тип ради одного булева свойства значило бы связать плагины слоя
 * с каждым компонентом, который ими пользуется.
 *
 * Подписка живёт на шине владельца, а владелец бывает долговечнее плагина:
 * свой `ctrl` приложения переживает перемонтирование, и каждое монтирование
 * ставит ему новый набор. Поэтому подписывается привязка не сама, а
 * методом плагина (`listen` — его `_listenTo`): подписку на чужую шину ведёт
 * база плагина — начинает с принятия набора и снимает в `destroy()`. Смену
 * открытости до принятия подписка не застаёт, и плагин при принятии
 * перечитывает её (`sync`).
 *
 * `null` — привязки нет: владельца нет, `property: null` или такого свойства
 * у владельца не объявлено.
 */
export function bindOverlayOpen(
	ctx: IPluginContext,
	options: IOverlayOpenOptions | undefined,
	onChange: (open: boolean) => void,
	listen: TOverlayOpenListen,
): IOverlayOpenState | null {
	const instance = ctx.getInstance<object>()
	const property = options?.property === undefined ? DEFAULT_PROPERTY : options.property

	if (!instance || !property || !(property in instance)) return null

	const read = (): boolean => !!Reflect.get(instance, property)
	const write = (value: boolean): void => {
		Reflect.set(instance, property, value)
	}
	const events: unknown = Reflect.get(instance, 'events')
	const sync = (): void => onChange(read())

	if (isEventSource(events)) listen(events, options?.event ?? `change:${property}`, sync)

	return {
		read,
		write,
		close(reason) {
			if (isCloseRequestable(instance)) {
				instance.requestClose(reason)
			} else {
				write(false)
			}
		},
		sync,
	}
}
