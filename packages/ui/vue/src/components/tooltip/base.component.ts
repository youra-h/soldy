import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { TooltipDescriptor } from '@soldy-ui/setup'
import type { ITooltip } from '@soldy-ui/core'

export const emitsTooltip: TEmits = useEmits(TooltipDescriptor())

export const propsTooltip: TProps = useProps(TooltipDescriptor()) as TProps

export type TooltipProps = UseProps<typeof TooltipDescriptor, ITooltip>

export default {
	name: 'BaseTooltip',
	emits: emitsTooltip,
	props: propsTooltip,
}
