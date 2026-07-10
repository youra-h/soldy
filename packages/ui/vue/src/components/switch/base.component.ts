import { type ISwitchProps, type ISwitch, TSwitch } from '@soldy/core'
import {
	BaseInputControl,
	emitsInputControl,
	propsInputControl,
	syncInputControl,
	type IInputControlState,
} from '../input-control'
import type { TEmits, TProps, ISyncComponentOptions } from '../../types/common'
import { Spinner } from '../spinner'
import { useInheritProps } from '../../composables/useInheritProps'

export const emitsSwitch: TEmits = [...emitsInputControl] as const

export const propsSwitch: TProps = {
	...useInheritProps(propsInputControl, TSwitch),
}

export default {
	name: 'BaseSwitch',
	extends: BaseInputControl,
	components: { Spinner },
	emits: emitsSwitch,
	props: propsSwitch,
}

/**
 * Bind props to ctrl properties.
 * @param props
 * @param ctrl
 */
export function syncSwitch(
	options: ISyncComponentOptions<ISwitchProps, ISwitch>,
): IInputControlState<boolean | undefined> {
	const syncProps = syncInputControl(options)

	return {
		...syncProps,
	}
}
