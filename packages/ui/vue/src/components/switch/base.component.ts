import { BaseInputControl } from '../input-control'
import { useEmits, useProps } from '../../adapter'
import type { TEmits, TProps } from '../../types/common'
import { SwitchDescriptor } from '@soldy/setup'
import { Spinner } from '../spinner'

export const emitsSwitch: TEmits = useEmits(SwitchDescriptor) as unknown as TEmits

export const propsSwitch: TProps = useProps(SwitchDescriptor) as TProps

export default {
	name: 'BaseSwitch',
	extends: BaseInputControl,
	components: { Spinner },
	emits: emitsSwitch,
	props: propsSwitch,
}
