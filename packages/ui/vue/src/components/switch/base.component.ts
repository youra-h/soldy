import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { SwitchDescriptor } from '@soldy-ui/setup'
import { Spinner } from '../spinner'
import type { ISwitch } from '@soldy-ui/core'

export const emitsSwitch: TEmits = useEmits(SwitchDescriptor())

export const propsSwitch: TProps = useProps(SwitchDescriptor()) as TProps

export type SwitchProps = UseProps<typeof SwitchDescriptor, ISwitch>

export default {
	name: 'BaseSwitch',
	components: { Spinner },
	emits: emitsSwitch,
	props: propsSwitch,
}
