import { activationOf, batchOf } from '@soldy-ui/core'
import type { IRadioGroupItem } from '@soldy-ui/core'
import type { IPluginContext } from '../../base'
import { TCollectionElements } from '../collection'
import { isReachable } from '../collection/reachable'
import { fieldOf } from '../input/field'

/**
 * Остановка группы радио — узел фокуса RadioGroup (`focusTarget` плагина
 * действия): поле отмеченного радио, а без отметки — первого, на которое можно
 * перейти. Туда же ведёт Tab: остановку группы по общему `name` выбирает
 * браузер, и она одна.
 *
 * Отмеченное радио берётся по модели — активному в коллекции, — а не по
 * `checked` поля: в такте смены значения разметка ещё старая, и фокус ушёл бы
 * на прежнее радио. Отмеченное выключено или скрыто — фокус оно не примет, и
 * остановка — первое, на которое можно перейти, как у табов. Поле — правилом
 * узла фокуса радио (`fieldOf`), по узлу радио из реестра узлов коллекции.
 *
 * `null` — радио, на которые можно перейти, нет, или узла радио нет в
 * документе.
 */
export function radioStopOf(_root: Element, ctx: IPluginContext): Element | null {
	const elements = ctx.get(TCollectionElements) ?? null
	const engine = elements?.engine ?? null
	const checked = activationOf<IRadioGroupItem>(engine)?.activeItem
	const radio =
		checked && isReachable(checked)
			? checked
			: batchOf<IRadioGroupItem>(engine)?.shown.find(isReachable)
	const node = radio ? elements?.getElementByItem(radio) : null

	return node ? fieldOf(node) : null
}
