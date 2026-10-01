import type { IExtension, IExtensionItems } from '../../../../../base/collection'
import type { TListEvents, TListIndicator } from '../../../../list'
import type { ISelect } from '../../../types'
import type { ISelectItem } from '../../../item/types'
import type { ISelectItemExtension } from './item'

/**
 * Контракт расширения Select.
 *
 * Держит текст выбранного, который показывает поле, и многовыборность
 * списка. О выборе пользователя сообщает событием `choose`.
 */
export interface ISelectExtension<TItem extends ISelectItem = ISelectItem>
	extends
		IExtension<TItem, TSelectExtensionEvents>,
		IExtensionItems<TItem, ISelectItemExtension<TItem>> {
	/** Текст выбранного — то, что показывает поле вместо `placeholder`. */
	readonly text: string
	/** Где стоит отметка выбранной опции — свойство поля, не опции. */
	readonly indicator: TListIndicator
	/**
	 * Выбрать опцию с учётом режима и `closeOnSelect` владельца.
	 * Возвращает `false`, если опция недоступна или выбор отменили
	 * в `item:select:before`.
	 *
	 * Выбор пользователя: поле переписывается, что бы в нём ни было набрано, и
	 * приходит `choose`.
	 */
	chooseItem(item: TItem): boolean
	/**
	 * Снять выбор целиком. Тоже выбор пользователя — выбор «ничего»: поле
	 * пустеет, приходит `choose`.
	 */
	clear(): void
}

/** Опции движка Select: владелец приходит и уходит после сборки. */
export type TSelectEngineOptions<TOwner extends ISelect = ISelect> = {
	owner: TOwner
}

/**
 * События расширения `select`: сторона отметки, доезжающая до item-адаптеров,
 * и выбор пользователя.
 *
 * Карта была `Record<string, never>` — «событий нет». Но у неё индексная
 * сигнатура, поэтому проверка читала её как «любое имя», и `change:indicator`,
 * который расширение релеит с владельца, проезжал мимо. Имя объявлено, тип
 * взят у источника — разойтись не даст.
 *
 * До фасадов карта не доезжает: фасад Select пробрасывает события `tags`, а
 * не `select`.
 */
export type TSelectExtensionEvents = Pick<TListEvents, 'change:indicator'> & {
	/**
	 * choose — выбор пользователя (`chooseItem`, `clear`) состоялся и уже
	 * записан в поле. Приходит и тогда, когда выбор не изменился: повторный
	 * выбор той же опции, очистка пустого поля.
	 *
	 * По `change:selection` выбор пользователя не отличить: тот приходит и на
	 * смену `value`, и на смену состава, и на закрытие тега. Поэтому набранное
	 * и отбор `TEditablePlugin` сбрасывает по этому событию — прерывает набор то
	 * же, что безусловно пишет поле.
	 */
	choose: () => void
}
