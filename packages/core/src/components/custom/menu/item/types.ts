import type {
	IValueControl,
	IValueControlProps,
	TValueControlEvents,
} from '../../../base/value-control'
import type { TChangeEvent, TValuePayload } from '../../../../common'

export type TMenuItemEvents = TValueControlEvents<string | number> & {
	/** change:text */
	'change:text': (payload: TValuePayload<string>) => void
	/** Запись своего `text` — подправить или отменить (`TChangeEvent`) */
	'change:text:before': (e: TChangeEvent<string>) => void
}

/**
 * Пропсы пункта меню.
 *
 * `value` — ключ пункта: по нему потребитель узнаёт, что нажали (`choose`), и
 * по нему коллекция сверяет состав. `text` — то, что видно, и то, по чему
 * идёт набор по первым буквам.
 */
export interface IMenuItemProps extends IValueControlProps<string | number> {
	/** Текст пункта */
	text?: string
}

/**
 * Пункт меню любого вида — действие, флажок, пункт с подменю.
 *
 * Карта событий по умолчанию стёрта (`any`), как у констрейнта: коллекция
 * меню держит пункты разных видов, у пункта с подменю карта шире — своя
 * открытость и выбор в подменю, — а шина инвариантна по карте, и пункт с
 * подменю иначе не встал бы в коллекцию пунктов. Точная карта — у класса
 * (`TMenuItem`, `TMenuSubmenu`) и у интерфейса вида.
 */
export interface IMenuItem<
	TProps extends IMenuItemProps = IMenuItemProps,
	TEvents extends TMenuItemEvents = any,
> extends IValueControl<string | number, TProps, TEvents> {
	/** Текст пункта */
	text: string
	/**
	 * Отмечается ли пункт: у флажка — да, у действия — нет. По нему коллекция
	 * пишет `aria-checked` и решает, что делает нажатие
	 */
	readonly checkable: boolean
}
