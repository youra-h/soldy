/**
 * TFieldControlExtension — контрол берёт связку поля формы `Field` над собой.
 *
 * Поле даёт контролу три вещи: ошибку (`invalid` — `data-invalid` и
 * `aria-invalid` контрола), ссылки на видимые части (`aria-describedby` на
 * подсказку или ошибку, у группы — `aria-labelledby` на подпись) и, у
 * labelable-контрола без своего `id`, `id` поля — на него ведёт `for`
 * подписи. Ссылки пишет `TAriaPlugin` контрола — вторым входом рядом с
 * пропсами `aria_*`, и своё имя контрола главнее подписи поля. Labelable-
 * контролу (Input, Select, CheckBox, Switch, Rating) имя даёт `for`, а не
 * ссылка: `aria-labelledby` перекрыл бы подпись `Label` у флажка в поле.
 *
 * `id` поле задаёт значением `id` контрола, а не записью в его `aria`: свой
 * `id` каждый контрол уже ведёт до своего `<input>`, и у Select — до поля
 * внутри. Набор `aria` Select разметка кладёт атрибутами на вложенный Input,
 * а `id` там — проп Input, и снятый `id` из набора вернул бы `id` поля Select к
 * умолчанию поверх своего. Свой `id` потребителя главнее: поле задаёт `id`,
 * только пока своего нет, и снимает свой, когда контрол уходит из поля.
 *
 * Сам о себе контрол сообщает полю — `id` и labelable ли он: только он их
 * знает. По ним плагин связок поля решает `for` подписи — `id` контрола или
 * ничего у группы.
 *
 * Фазы — как у связки панели Tabs (`TTabsContentBindingExtension`):
 *
 * - **сборка** — ошибка, ссылки и `id`: всё это контрола, поэтому сервер и
 *   первый кадр рисуют его уже в поле;
 * - **вход** (`attach` контекста) — связка его: подписки на ошибку поля, его
 *   ссылки и свой `change:id` и сообщение полю о себе. Шины поля контролу
 *   чужие, а собранный контрол фреймворк вправе выбросить, так и не приняв;
 *   связку к этому времени мог взять контрол, принятый раньше, — тогда
 *   собранное снимается;
 * - **снятие** (`destroy` контекста) — отписка, связка свободна, записанное
 *   контролу — назад. Контекст, собранный, но так и не принятый, снимается
 *   тоже.
 *
 * Поле — одно на контрол, контрол — один на поле: связку берёт первый, и
 * занятую не берёт никто. Деталь чужой разметки (`embedded`: поле Select,
 * поля DatePicker) связку не берёт — её взял владелец детали. Своему поддереву
 * контрол опускает пустую связку: контролы в его слотах — его содержимое.
 *
 * Поля выше нет — контрол ведёт себя так, будто связки нет вовсе.
 *
 * Использование:
 *   adapter.use(TFieldControlExtension, { elevator: VueElevatorFactory })
 */

import { TAriaPlugin } from '@soldy-ui/plugins'
import type { TInstanceContext } from '../../../protected/adapter/context'
import { FIELD_ELEVATOR } from './keys'
import type { IFieldControlExtensionOptions, TFieldControl } from './types'

export class TFieldControlExtension {
	constructor(context: TInstanceContext<TFieldControl>, options: IFieldControlExtensionOptions) {
		const elevator = options.elevator(FIELD_ELEVATOR)
		const link = elevator.up()

		// Поля выше нет — прятать от слотов нечего: контрол вне поля лифту
		// ничего не опускает и ничего ему не стоит (чекбоксы строк таблицы)
		if (!link) return

		elevator.down(null)

		if (context.embedded !== undefined || link.ids.bound) return

		const { field, ids } = link
		const control = context.instance
		const aria = context.bundle?.get(TAriaPlugin)
		/** Контрол принят: связка его, на шины поля и контрола подписаны. */
		let attached = false

		const syncInvalid = (): void => {
			control.invalid = field.invalid
		}

		const syncLinks = (): void => {
			if (!aria) return

			const { labelledBy, describedBy } = ids.links

			aria.links = { labelledBy: control.labelable ? undefined : labelledBy, describedBy }
		}

		/** `id` поля — labelable-контролу без своего. */
		const syncId = (): void => {
			if ('id' in control && control.labelable && control.id === undefined) {
				control.id = ids.controlId
			}
		}

		const apply = (): void => {
			syncInvalid()
			syncLinks()
			syncId()
		}

		/** Сообщить полю о себе: по `id` и labelable оно решает `for` подписи. */
		const bind = (): void => {
			ids.bindControl({
				id: 'id' in control ? control.id : undefined,
				labelable: control.labelable,
			})
		}

		/** `id` сменился: сняли свой — снова `id` поля, и `for` подписи — за ним. */
		const rebind = (): void => {
			syncId()
			bind()
		}

		/** Всё, что связка записала контролу, — назад. */
		const release = (): void => {
			control.invalid = false

			if (aria) aria.links = {}
			if ('id' in control && control.id === ids.controlId) control.id = undefined
		}

		apply()

		context.events.on('attach', () => {
			// Связку взял контрол, принятый раньше: собранное — назад
			if (ids.bound) {
				release()

				return
			}

			attached = true
			field.events.on('change:invalid', syncInvalid)
			ids.events.on('change:links', syncLinks)

			if ('id' in control) control.events.on('change:id', rebind)

			// Поле могло смениться между сборкой и приёмом
			apply()
			bind()
		})

		context.events.on('destroy', () => {
			if (attached) {
				field.events.off('change:invalid', syncInvalid)
				ids.events.off('change:links', syncLinks)

				if ('id' in control) control.events.off('change:id', rebind)

				ids.unbindControl()
			}

			attached = false
			release()
		})
	}
}
