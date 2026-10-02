import type { IRadioGroupItem } from '@soldy-ui/core'
import type { RadioGroupCollectionItemDescriptor, RadioGroupItemDescriptor } from '@soldy-ui/setup'
import type { EventProps, TDomAttributes, TFieldAttributes, UseDomProps } from '../../../types'

/** События радио — свои (ядро и плагины) и фасада: отметка и порядок. */
export type RadioGroupItemEventProps = EventProps<typeof RadioGroupItemDescriptor> &
	EventProps<typeof RadioGroupCollectionItemDescriptor>

/** Атрибуты радио: класс и стиль — корню, остальное — полю `<input type="radio">`. */
export type RadioGroupItemAttributes = TDomAttributes<
	typeof RadioGroupItemDescriptor,
	TFieldAttributes,
	RadioGroupItemEventProps
>

/**
 * Пропсы радио. Отметка (`active` фасада) входит в интерфейс пропсов ядра
 * (`IRadioGroupItemProps`), и тип её несёт дескриптор радио. `name`, `size`,
 * `variant` и `view` раздаёт группа, и в разметке их не задать — ни пропом,
 * ни атрибутом поля.
 */
export type RadioGroupItemProps = UseDomProps<
	typeof RadioGroupItemDescriptor,
	IRadioGroupItem,
	RadioGroupItemEventProps,
	TFieldAttributes
>
