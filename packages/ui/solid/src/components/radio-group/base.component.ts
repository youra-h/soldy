import type { IRadioGroup } from '@soldy-ui/core'
import type { RadioGroupCollectionDescriptor, RadioGroupDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../types'

/**
 * События RadioGroup — свои (ядро и плагины) и фасада коллекции: отметка
 * радио, состав, `engine:create`. Контекстов у группы два, и колбэки обоих —
 * пропсы одного компонента.
 */
export type RadioGroupEventProps = EventProps<typeof RadioGroupDescriptor> &
	EventProps<typeof RadioGroupCollectionDescriptor>

/**
 * Пропсы RadioGroup. Коллекционные входы (`engine`, `items`, `trackBy`)
 * отдельно не перечислены: они входят в интерфейс пропсов ядра
 * (`IRadioGroupProps`), и тип их несёт дескриптор компонента.
 */
export type RadioGroupProps = UseDomProps<
	typeof RadioGroupDescriptor,
	IRadioGroup,
	RadioGroupEventProps
>
