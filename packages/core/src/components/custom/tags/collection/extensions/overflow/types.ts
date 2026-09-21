import type { IExtension } from '../../../../../base/collection'
import type { IPopover } from '../../../../popover'
import type { ITags } from '../../../types'
import type { ITagsItem } from '../../../item/types'

/**
 * Контракт расширения переполнения.
 *
 * Знание «какие теги остались в ряду, а какие уехали в панель» — это знание о
 * составе, поэтому оно здесь, а не в компоненте и не в плагине: плагин только
 * меряет и сообщает результат замера (`notifyFit`), как клавиатура сообщает
 * тег под фокусом (`notifyFocus`).
 */
export interface ITagsOverflowExtension<TItem extends ITagsItem = ITagsItem> extends IExtension<
	TItem,
	TTagsOverflowExtensionEvents
> {
	/** Теги, которые рисует ряд. Вне `popover` — всё показанное. */
	readonly fitted: TItem[]
	/** Теги, которые рисует панель. Вне `popover` — пусто. */
	readonly overflowed: TItem[]
	/** Инстанс панели, пока режим `popover`; иначе `null`. */
	readonly panel: IPopover | null
	/**
	 * Место кнопки «…» в ряду — номер первого не поместившегося тега. Без
	 * хвоста — `0`: кнопки в ряду нет.
	 */
	readonly moreOrder: number

	/**
	 * Сообщить результат замера: сколько первых показанных тегов помещается в
	 * ряд. Зовёт плагин переполнения — DOM ядру недоступен.
	 */
	notifyFit(count: number): void
}

export interface ITagsOverflowExtensionOptions<TOwner extends ITags = ITags> {
	/** Ссылка на инстанс компонента TTags. */
	owner: TOwner
}

export type TTagsOverflowExtensionEvents = {
	/**
	 * Состав ряда и панели изменился. Без аргументов: читателю нужно
	 * перечитать `fitted` и `overflowed` — как `change:shown` у `batch`.
	 */
	'change:fit': () => void
	/** Сменился инстанс панели (появился или пропал вместе с режимом). */
	'change:panel': (value: IPopover | null) => void
}
