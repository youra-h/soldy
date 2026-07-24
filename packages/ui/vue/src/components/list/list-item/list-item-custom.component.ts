import { BaseValueControl } from '../../value-control'
import { useEmits, useProps } from '../../../adapter'
import type { TEmits, TProps } from '../../../types/common'
import { ListItemCustomDescriptor } from '@soldy/setup'

export const emitsListItemCustom: TEmits = useEmits(ListItemCustomDescriptor) as unknown as TEmits

export const propsListItemCustom: TProps = useProps(ListItemCustomDescriptor) as TProps

export default {
	name: 'BaseListItemCustom',
	extends: BaseValueControl,
	emits: emitsListItemCustom,
	props: propsListItemCustom,
}

	instance.events.on('change:text', (payload: TValuePayload<string>) => {
		emit?.('change:text', payload)
		emit?.('update:text', payload.newValue)
	})

	instance.events.on('change:wordWrap', (value: boolean) => {
		emit?.('change:wordWrap', value)
		emit?.('update:wordWrap', value)
	})

	track(props, 'text', (value) => {
		if (value !== undefined && value !== instance.text) {
			instance.text = value
		}
	})

	track(props, 'wordWrap', (value) => {
		if (value !== undefined && value !== instance.wordWrap) {
			instance.wordWrap = value
		}
	})

	return {
		...syncProps,
		...useSyncProps(instance.events as any, {
			text: () => instance.text,
			wordWrap: () => instance.wordWrap,
		}),
	}
}
