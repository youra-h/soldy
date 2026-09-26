import type { TComponentViewStates } from '../component-view'
import type { ICloseRequestable, ILayer, ILayerProps, TCloseEvent, TLayerEvents } from '../layer'
import type { TAriaAttributes, TDatasetAttributes } from '../../../common'

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
}

export interface IModalLayer<
	TProps extends IModalLayerProps = IModalLayerProps,
	TEvents extends Record<string, (...args: any) => any> = TModalLayerEvents,
	TStates extends TComponentViewStates = TComponentViewStates,
>
	extends ILayer<TProps, TEvents, TStates>, ICloseRequestable {
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
	/** `id` заголовка: на него ссылается `aria-labelledby` панели */
	readonly titleAria: TAriaAttributes
	/** Имя кнопки закрытия: `closeLabel` */
	readonly closeAria: TAriaAttributes
	/** `data-*` подложки: тот же номер слоя и та же открытость, что у панели */
	readonly backdropDataset: TDatasetAttributes
}
