import type { ILayer, ILayerProps, TLayerEvents } from '../../base/layer'
import type { TCollectionStorageDriverEvents } from '../../base/collection'
import type { IToastsCollectionProps } from './collection/types'
import type { IToastsItem, IToastsItemProps } from './item/types'

/**
 * Где регион тостов: у верхнего или нижнего края окна — у начала строки, по
 * центру или у конца. `start` и `end` логические: в RTL регион встаёт у
 * другого края сам.
 *
 * Значение читают ядро (сторона, куда тост смахивают) и тема (место региона),
 * и смысл у него один в любой теме, поэтому это union ядра, а не реестр темы.
 */
export type TToastsPlacement =
	'top-start' | 'top' | 'top-end' | 'bottom-start' | 'bottom' | 'bottom-end'

export type TToastsEvents = TLayerEvents &
	TCollectionStorageDriverEvents<IToastsItem> & {
		/** change:placement */
		'change:placement': (value: TToastsPlacement) => void
		/** change:max */
		'change:max': (value: number) => void
		/** change:duration */
		'change:duration': (value: number) => void
	}

/** Пропсы самого компонента (без коллекционной части). */
export interface IToastsComponentProps extends ILayerProps {
	/** Где регион тостов. По умолчанию `bottom-end` */
	placement?: TToastsPlacement
	/** Сколько тостов видно разом; остальные ждут места. По умолчанию 3 */
	max?: number
	/**
	 * Сколько тост держится на экране, мс, — если своей длительности у тоста
	 * нет. `0` — тосты держатся, пока их не закроют. По умолчанию 5000
	 */
	duration?: number
}

/** Полный набор пропсов Toasts: компонентные + коллекция (engine, items). */
export interface IToastsProps
	extends IToastsComponentProps, IToastsCollectionProps<IToastsItemProps, IToastsItem> {}

export interface IToasts<
	TProps extends IToastsComponentProps = IToastsProps,
	TEvents extends TToastsEvents = TToastsEvents,
> extends ILayer<TProps, TEvents> {
	/** Где регион тостов */
	placement: TToastsPlacement
	/** Сколько тостов видно разом */
	max: number
	/** Длительность тоста без своей, мс; `0` — держится, пока не закроют */
	duration: number
}
