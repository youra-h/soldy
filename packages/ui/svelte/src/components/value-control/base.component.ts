import type { IValueControl } from '@soldy-ui/core'
import type { ValueControlDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseProps } from '../../types'

/** События слоя ValueControl (core + плагины), выведены из дескриптора автоматически. */
export type ValueControlEventProps = EventProps<typeof ValueControlDescriptor>

/**
 * Пропсы слоя ValueControl. Тип значения у слоя не задан: его сужает
 * наследник — ползунок числом или списком чисел, пагинация ключом страницы.
 */
export type ValueControlProps = UseProps<
	typeof ValueControlDescriptor,
	IValueControl<unknown>,
	ValueControlEventProps
>
