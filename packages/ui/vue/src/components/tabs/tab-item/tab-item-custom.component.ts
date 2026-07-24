import { BaseValueControl } from '../../value-control'
import { useEmits, useProps } from '../../../adapter'
import type { TEmits, TProps } from '../../../types/common'
import { TabItemCustomDescriptor } from '@soldy/setup'

export const emitsTabItemCustom: TEmits = useEmits(TabItemCustomDescriptor) as unknown as TEmits

export const propsTabItemCustom: TProps = useProps(TabItemCustomDescriptor) as TProps

export default {
	name: 'BaseTabItemCustom',
	extends: BaseValueControl,
	emits: emitsTabItemCustom,
	props: propsTabItemCustom,
}
) {
	const syncProps = syncValueControl(options)

	const { props, instance, emit } = options

	// Пробрасываем события core-инстанса наружу (Vue events)
	instance.events.on('change:text', (payload: TValuePayload<string>) => {
		emit?.('change:text', payload)
		emit?.('update:text', payload)
	})

	instance.events.on('change:closable', (value: boolean | undefined) => {
		emit?.('change:closable', value)
		emit?.('update:closable', value)
	})

	instance.events.on('close', () => {
		emit?.('close')
	})

	track(props, 'text', (value) => {
		if (value !== undefined && value !== instance.text) {
			instance.text = value
		}
	})

	track(props, 'closable', (value) => {
		if (value !== undefined && value !== instance.closable) {
			instance.closable = value
		}
	})

	return {
		...syncProps,
		...useSyncProps(instance.events as any, {
			text: () => instance.text,
			closable: () => instance.closable,
		}),
	}
}
