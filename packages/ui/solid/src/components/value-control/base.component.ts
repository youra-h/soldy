import type { IValueControl } from '@soldy-ui/core'
import type { ValueControlDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseProps } from '../../types'

/** События слоя ValueControl (core + плагины), выведены из дескриптора автоматически. */
export type ValueControlEventProps = EventProps<typeof ValueControlDescriptor>

/** Значение слоя — любого типа: число у ползунка, ключ у пагинации, строка у поля. */
export type ValueControlProps = UseProps<
	typeof ValueControlDescriptor,
	IValueControl<unknown>,
	ValueControlEventProps
>
