import type { IMenuRadioGroup } from '@soldy-ui/core'
import type { MenuRadioGroupDescriptor } from '@soldy-ui/setup'
import type { EventProps, UseDomProps } from '../../../types'

/** События группы переключателей — свои (ядро и плагин имени): подпись и значение. */
export type MenuRadioGroupEventProps = EventProps<typeof MenuRadioGroupDescriptor>

/**
 * Пропсы группы переключателей: подпись — проп `label`, значение отмеченного
 * переключателя — `value`, переключатели — содержимое.
 */
export type MenuRadioGroupProps = UseDomProps<
	typeof MenuRadioGroupDescriptor,
	IMenuRadioGroup,
	MenuRadioGroupEventProps
>
