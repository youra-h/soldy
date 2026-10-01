import type { ICloseRequestable, ILayer, ILayerProps, TCloseEvent, TLayerEvents } from '../layer'
import type { TAria, TAriaAttributes, TDatasetAttributes } from '../../../common'

export interface IModalLayerProps extends ILayerProps {
	/**
	 * Ширина панели: число — px, строка — CSS-значение. Не задана — ширину
	 * даёт тема
	 */
	width?: number | string
	/**
	 * Высота панели: число — px, строка — CSS-значение. Не задана — высоту
	 * даёт тема
	 */
	height?: number | string
	/** Показывать ли кнопку закрытия */
	closable?: boolean
	/** Имя кнопки закрытия для скринридера */
	closeLabel?: string
	/**
	 * Закрывают ли панель нажатие мимо и Escape. Выключено — только кнопка
	 * закрытия, свой жест панели и код
	 */
	dismissible?: boolean
}

export type TModalLayerEvents = TLayerEvents & {
	/**
	 * close:before — пользователь закрывает панель: кнопкой закрытия, нажатием
	 * мимо, Escape или жестом (`e.reason`). `e.preventDefault()` оставляет её
	 * открытой. Запись `visible` из кода и `v-model` его не шлют.
	 */
	'close:before': (e: TCloseEvent) => void
	/** change:width */
	'change:width': (value: number | string | undefined) => void
	/** change:height */
	'change:height': (value: number | string | undefined) => void
	/** change:closable */
	'change:closable': (value: boolean) => void
	/** change:closeLabel */
	'change:closeLabel': (value: string) => void
	/** change:dismissible */
	'change:dismissible': (value: boolean) => void
	/** change:titleAria — набор атрибутов заголовка изменился */
	'change:titleAria': (value: TAriaAttributes) => void
}

export interface IModalLayer<
	TProps extends IModalLayerProps = IModalLayerProps,
	TEvents extends Record<string, (...args: any) => any> = TModalLayerEvents,
>
	extends ILayer<TProps, TEvents>, ICloseRequestable {
	/** Ширина панели; `undefined` — ширину даёт тема */
	width: number | string | undefined
	/** Высота панели; `undefined` — высоту даёт тема */
	height: number | string | undefined
	/** Показывать ли кнопку закрытия */
	closable: boolean
	/** Имя кнопки закрытия для скринридера */
	closeLabel: string
	/** Закрывают ли панель нажатие мимо и Escape */
	dismissible: boolean
	/** Атрибуты заголовка: `id`, на который ссылается `aria-labelledby` панели, пишет плагин */
	readonly titleAria: TAria
	/** Имя кнопки закрытия: `closeLabel` */
	readonly closeAria: TAriaAttributes
	/** `data-*` подложки: тот же номер слоя и та же открытость, что у панели */
	readonly backdropDataset: TDatasetAttributes
}
