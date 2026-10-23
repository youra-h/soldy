import type { ISelect } from '@soldy-ui/core'
import type { SelectCollectionDescriptor, SelectDescriptor } from '@soldy-ui/setup'
import type { EventProps, TDomAttributes, TFieldAttributes, UseDomProps } from '../../types'

/** События Select — свои и фасада коллекции. */
export type SelectEventProps = EventProps<typeof SelectDescriptor> &
	EventProps<typeof SelectCollectionDescriptor>

/** Атрибуты Select: класс и стиль — корню, остальное — `<input>` поля. */
export type SelectAttributes = TDomAttributes<
	typeof SelectDescriptor,
	SelectEventProps,
	TFieldAttributes
>

/** Пропсы Select; коллекционные входы несёт интерфейс ядра (`ISelectProps`). */
export type SelectProps = UseDomProps<
	typeof SelectDescriptor,
	ISelect,
	SelectEventProps,
	TFieldAttributes
>
