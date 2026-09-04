import { BaseInputControl } from '../input-control'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps, UseProps } from '../../types/common'
import { SwitchDescriptor } from '@soldy/setup'
import { Spinner } from '../spinner'
import type { ISwitch } from '@soldy/core'

export const emitsSwitch: TEmits = useEmits(SwitchDescriptor()) as unknown as TEmits

export const propsSwitch: TProps = useProps(SwitchDescriptor()) as TProps

export type SwitchProps = UseProps<typeof SwitchDescriptor, ISwitch>

export default {
	name: 'BaseSwitch',
	components: { Spinner },
	emits: emitsSwitch,
	props: propsSwitch,
}
