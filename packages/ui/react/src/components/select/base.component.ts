import type { ISelect } from '@soldy-ui/core'
import type { SelectCollectionDescriptor, SelectDescriptor } from '@soldy-ui/setup'
import type { EventProps, TDomAttributes, TFieldAttributes, UseDomProps } from '../../types'

/**
 * События Select — свои (ядро и плагины) и фасада коллекции: режим и выбор,
 * состав, группы, `engine:create`. Контекстов у Select два, и колбэки обоих —
 * пропсы одного компонента.
 */
export type SelectEventProps = EventProps<typeof SelectDescriptor> &
	EventProps<typeof SelectCollectionDescriptor>

/**
 * Атрибуты Select: класс и стиль — корню, остальное — `<input>` поля, как у
 * Input: фокус всегда на поле, и `aria-label`, `id` и обработчики
 * потребителя достаются комбобоксу, а не корню без роли.
 */
export type SelectAttributes = TDomAttributes<
	typeof SelectDescriptor,
	TFieldAttributes,
	SelectEventProps
>

/**
 * Пропсы Select. Коллекционные входы (`engine`, `items`, `mode`, `trackBy`,
 * `groupBy`, `groups`, `tags_overflow`) отдельно не перечислены: они входят в
 * интерфейс пропсов ядра (`ISelectProps`), и тип их несёт дескриптор
 * компонента.
 */
export type SelectProps = UseDomProps<
	typeof SelectDescriptor,
	ISelect,
	SelectEventProps,
	TFieldAttributes
>
