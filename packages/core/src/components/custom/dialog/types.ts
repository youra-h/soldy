import type { TComponentViewStates } from '../../base/component-view'
import type { IModalLayer, IModalLayerProps, TModalLayerEvents } from '../../base/modal-layer'
import type { TAriaAttributes } from '../../../common'

/**
 * Где окно стоит на экране: по центру или у одной из сторон.
 *
 * Смысл у значения один в любой теме, поэтому это union ядра, а не реестр
 * темы — как `position` у Label. `start` и `end` — логические: в RTL окно
 * само встаёт у другого края. Раскладывает место тема, по модификатору
 * `--placement-<v>`; координат ядро не считает.
 */
export type TDialogPlacement = 'center' | 'start' | 'end' | 'top' | 'bottom'

export type TDialogEvents = TModalLayerEvents & {
	/** change:placement */
	'change:placement': (value: TDialogPlacement) => void
	/** change:maximized */
	'change:maximized': (value: boolean) => void
	/** change:maximizable */
	'change:maximizable': (value: boolean) => void
	/** change:maximizeLabel */
	'change:maximizeLabel': (value: string) => void
	/** change:alert */
	'change:alert': (value: boolean) => void
}

export interface IDialogProps extends IModalLayerProps {
	/**
	 * Ширина окна: число — px, строка — CSS-значение. Не задана — ширину даёт
	 * тема. `auto` — по экрану с отступом, по содержимому — `fit-content`
	 */
	width?: number | string
	/**
	 * Высота окна: число — px, строка — CSS-значение. Не задана — по
	 * содержимому. `auto` — по экрану с отступом
	 */
	height?: number | string
	/** Где окно стоит на экране: по центру или у стороны */
	placement?: TDialogPlacement
	/** Развёрнуто ли окно на весь экран */
	maximized?: boolean
	/** Показывать ли кнопку разворота */
	maximizable?: boolean
	/** Имя кнопки разворота для скринридера */
	maximizeLabel?: string
	/**
	 * Окно — предупреждение (`role="alertdialog"`): прерывает работу и ждёт
	 * ответа. Описание — тело окна
	 */
	alert?: boolean
}

export interface IDialog extends IModalLayer<IDialogProps, TDialogEvents, TComponentViewStates> {
	/** Где окно стоит на экране */
	placement: TDialogPlacement
	/** Развёрнуто ли окно на весь экран */
	maximized: boolean
	/** Показывать ли кнопку разворота */
	maximizable: boolean
	/** Имя кнопки разворота для скринридера */
	maximizeLabel: string
	/** Окно — предупреждение (`role="alertdialog"`) */
	alert: boolean
	/** `id` тела: на него ссылается `aria-describedby` предупреждения */
	readonly bodyAria: TAriaAttributes
	/** Имя и состояние кнопки разворота: `maximizeLabel` и `aria-pressed` */
	readonly maximizeAria: TAriaAttributes
	/** Развернуть окно или вернуть ему размер — действие кнопки разворота */
	toggleMaximized(): void
}
