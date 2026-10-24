/**
 * TFieldControlExtension — контрол берёт связку поля формы `Field` над собой.
 *
 * Поле даёт контролу три вещи: ошибку (`invalid` — `data-invalid` и
 * `aria-invalid` контрола), ссылки на видимые части (`aria-describedby` на
 * подсказку или ошибку, у группы — `aria-labelledby` на подпись) и, у
 * labelable-контрола без своего `id`, `id` поля — на него ведёт `for`
 * подписи. Ссылки пишет `TAriaPlugin` контрола — вторым входом рядом с
 * пропсами `aria_*`, и своё имя контрола главнее подписи поля. Labelable-
 * контролу (Input, NumberInput, Select, CheckBox, Switch, Rating, ползунок с
 * одной ручкой) имя даёт `for`, а не ссылка: `aria-labelledby` перекрыл бы
 * подпись `Label` у флажка в поле.
 *
 * `id` поле задаёт каналом самого контрола. У контрола с `TIdPlugin`
 * (`TInputControl`: Input, NumberInput, Select, CheckBox, Switch, Rating) —
 * значением `id` плагина, а не записью в `aria`: этот `id` каждый такой
 * контрол уже ведёт до своего `<input>`, и у Select — до поля внутри. Набор
 * `aria` Select разметка кладёт атрибутами на вложенный Input, а `id` там —
 * проп Input, и снятый `id` из набора вернул бы `id` поля Select к умолчанию
 * поверх своего. `id` приложения главнее: поле задаёт `id`, только пока его
 * нет, и снимает свой, когда контрол уходит из поля. У labelable-контрола без
 * `TIdPlugin` (ползунок) канала, кроме `aria`, нет — `id` ложится туда, как
 * `id` панели Tabs.
 *
 * Сам о себе контрол сообщает полю — `id` и labelable ли он: только он их
 * знает. По ним плагин связок поля решает `for` подписи — `id` контрола или
 * ничего у группы.
 *
 * Labelable контрол может сменить по ходу жизни: ползунок labelable, пока
 * ручка одна, а у нескольких ручек он — группа, и имя подписи ложится на его
 * корень, а не на поля ручек. Сменился (`change:labelable`) — подпись за ним:
 * labelable-контрол получает `id` поля и `for`, группа — ссылку на подпись,
 * а `id` от поля с неё снят.
 *
 * Фазы — как у связки панели Tabs (`TTabsContentBindingExtension`):
 *
 * - **сборка** — ошибка, ссылки и `id`: всё это контрола, поэтому сервер и
 *   первый кадр рисуют его уже в поле;
 * - **вход** (`attach` контекста) — связка его: подписки на ошибку поля, его
 *   ссылки, `change:id` его `TIdPlugin`, свой `change:labelable` и сообщение
 *   полю о себе.
 *   Шины поля контролу чужие, а собранный контрол фреймворк вправе выбросить,
 *   так и не приняв; связку к этому времени мог взять контрол, принятый
 *   раньше, — тогда собранное снимается;
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

import { TAriaPlugin, TIdPlugin } from '@soldy-ui/plugins'
import type { TInstanceContext } from '../../../protected/adapter/context'
import { FIELD_ELEVATOR } from './keys'
import type { IFieldControl, IFieldControlExtensionOptions } from './types'

export class TFieldControlExtension {
	constructor(context: TInstanceContext<IFieldControl>, options: IFieldControlExtensionOptions) {
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
		/** Канал `id` контрола: у контрола без него (ползунок) `id` от поля — в `aria`. */
		const idPlugin = context.bundle?.get(TIdPlugin)
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

		/** `id` от поля — назад; `id` приложения не трогается. */
		const releaseId = (): void => {
			if (!idPlugin) {
				if (control.aria.get('id') === ids.controlId) control.aria.remove('id')

				return
			}

			if (idPlugin.id === ids.controlId) idPlugin.id = undefined
		}

		/**
		 * `id` поля — labelable-контролу без `id` приложения, каналом контрола:
		 * значением его `TIdPlugin`, а у контрола без плагина — в его `aria`.
		 * Группе `id` от поля не нужен: подпись называет её ссылкой, — и снят,
		 * если контрол перестал быть labelable.
		 */
		const syncId = (): void => {
			if (!control.labelable) {
				releaseId()

				return
			}

			if (!idPlugin) {
				control.aria.add('id', ids.controlId)

				return
			}

			if (idPlugin.id === undefined) idPlugin.id = ids.controlId
		}

		const apply = (): void => {
			syncInvalid()
			syncLinks()
			syncId()
		}

		/** Сообщить полю о себе: по `id` и labelable оно решает `for` подписи. */
		const bind = (): void => {
			ids.bindControl({ id: idPlugin?.id, labelable: control.labelable })
		}

		/** `id` сменился: сняли свой — снова `id` поля, и `for` подписи — за ним. */
		const rebind = (): void => {
			syncId()
			bind()
		}

		/**
		 * Labelable сменился (у ползунка — число ручек): `id` поля, ссылка на
		 * подпись и `for` — за ним.
		 */
		const relabel = (): void => {
			syncId()
			syncLinks()
			bind()
		}

		/** Всё, что связка записала контролу, — назад. */
		const release = (): void => {
			control.invalid = false

			if (aria) aria.links = {}

			releaseId()
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
			control.events.on('change:labelable', relabel)
			idPlugin?.events.on('change:id', rebind)

			// Поле могло смениться между сборкой и приёмом
			apply()
			bind()
		})

		context.events.on('destroy', () => {
			if (attached) {
				field.events.off('change:invalid', syncInvalid)
				ids.events.off('change:links', syncLinks)
				control.events.off('change:labelable', relabel)
				idPlugin?.events.off('change:id', rebind)

				ids.unbindControl()
			}

			attached = false
			release()
		})
	}
}
