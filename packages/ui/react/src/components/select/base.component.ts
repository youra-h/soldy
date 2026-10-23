import type { ISelect } from '@soldy-ui/core'
import type { SelectCollectionDescriptor, SelectDescriptor } from '@soldy-ui/setup'
import type { EventProps, TDomAttributes, TFieldAttributes, UseDomProps } from '../../types'

/** Колбэки обоих контекстов Select — свой и фасада коллекции — пропсы одного компонента. */
export type SelectEventProps = EventProps<typeof SelectDescriptor> &
	EventProps<typeof SelectCollectionDescriptor>

/** Атрибуты Select: класс и стиль — корню, остальное — `<input>` поля. */
export type SelectAttributes = TDomAttributes<
	typeof SelectDescriptor,
	TFieldAttributes,
	SelectEventProps
>

export type SelectProps = UseDomProps<
	typeof SelectDescriptor,
	ISelect,
	SelectEventProps,
	TFieldAttributes
>
