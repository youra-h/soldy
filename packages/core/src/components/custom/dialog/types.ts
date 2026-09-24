import type { TComponentViewStates } from '../../base/component-view'
import type {
	ICloseRequestable,
	ILayer,
	ILayerProps,
	TCloseEvent,
	TLayerEvents,
} from '../../base/layer'
import type { TAriaAttributes, TDatasetAttributes } from '../../../common'

/**
 * Где окно стоит на экране: по центру или у одной из сторон.
 *
 * Смысл у значения один в любой теме, поэтому это union ядра, а не реестр
 * темы — как `position` у Label. `start` и `end` — логические: в RTL окно
 * само встаёт у другого края. Раскладывает место тема, по модификатору
 * `--placement-<v>`; координат ядро не считает.
 */
export type TDialogPlacement = 'center' | 'start' | 'end' | 'top' | 'bottom'

export type TDialogEvents = TLayerEvents & {
	/**
	 * close:before — пользователь закрывает окно: кнопкой закрытия, нажатием
	 * мимо или Escape (`e.reason`). `e.preventDefault()` оставляет окно
	 * открытым. Запись `visible` из кода и `v-model` его не шлют.
	 */
	'close:before': (e: TCloseEvent) => void
	/** change:width */
	'change:width': (value: number | string | undefined) => void
	/** change:height */
	'change:height': (value: number | string | undefined) => void
	/** change:placement */
	'change:placement': (value: TDialogPlacement) => void
	/** change:maximized */
	'change:maximized': (value: boolean) => void
	/** change:maximizable */
	'change:maximizable': (value: boolean) => void
	/** change:closable */
	'change:closable': (value: boolean) => void
	/** change:closeLabel */
	'change:closeLabel': (value: string) => void
	/** change:maximizeLabel */
	'change:maximizeLabel': (value: string) => void
	/** change:dismissible */
	'change:dismissible': (value: boolean) => void
	/** change:alert */
	'change:alert': (value: boolean) => void
}

export interface IDialogProps extends ILayerProps {
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
	/** Показывать ли кнопку закрытия */
	closable?: boolean
	/** Имя кнопки закрытия для скринридера */
	closeLabel?: string
	/** Имя кнопки разворота для скринридера */
	maximizeLabel?: string
	/**
	 * Закрывают ли окно нажатие мимо и Escape. Выключено — только кнопка
	 * закрытия и код
	 */
	dismissible?: boolean
	/**
	 * Окно — предупреждение (`role="alertdialog"`): прерывает работу и ждёт
	 * ответа. Описание — тело окна
	 */
	alert?: boolean
}

export interface IDialog
	extends ILayer<IDialogProps, TDialogEvents, TComponentViewStates>, ICloseRequestable {
	/** Ширина окна; `undefined` — ширину даёт тема */
	width: number | string | undefined
	/** Высота окна; `undefined` — по содержимому */
	height: number | string | undefined
	/** Где окно стоит на экране */
	placement: TDialogPlacement
	/** Развёрнуто ли окно на весь экран */
	maximized: boolean
	/** Показывать ли кнопку разворота */
	maximizable: boolean
	/** Показывать ли кнопку закрытия */
	closable: boolean
	/** Имя кнопки закрытия для скринридера */
	closeLabel: string
	/** Имя кнопки разворота для скринридера */
	maximizeLabel: string
	/** Закрывают ли окно нажатие мимо и Escape */
	dismissible: boolean
	/** Окно — предупреждение (`role="alertdialog"`) */
	alert: boolean
	/** `id` заголовка: на него ссылается `aria-labelledby` окна */
	readonly titleAria: TAriaAttributes
	/** `id` тела: на него ссылается `aria-describedby` предупреждения */
	readonly bodyAria: TAriaAttributes
	/** Имя кнопки закрытия: `closeLabel` */
	readonly closeAria: TAriaAttributes
	/** Имя и состояние кнопки разворота: `maximizeLabel` и `aria-pressed` */
	readonly maximizeAria: TAriaAttributes
	/** `data-*` подложки: тот же номер слоя, что у окна */
	readonly backdropDataset: TDatasetAttributes
	/** Развернуть окно или вернуть ему размер — действие кнопки разворота */
	toggleMaximized(): void
}
