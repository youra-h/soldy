import {
	RadioGroupCollectionDescriptor,
	RadioGroupDescriptor,
	TCollectionExtension,
	TFieldControlExtension,
} from '@soldy-ui/setup'
import { useAdapter, useAdapterContext, useCollectionAdapter } from '../../adapter'
import type { RadioGroupProps } from './base.component'

/** Поле формы `Field` связывается с группой, а не с радио: подпись называет группу, ошибка — её. */
export function useSetupRadioGroup(props: RadioGroupProps) {
	const {
		contexts: [adapter, collectionAdapter],
		layer,
	} = useAdapterContext((create, elevator) => {
		const adapter = create(RadioGroupDescriptor(), { ctrl: props.ctrl, props }).use(
			TFieldControlExtension,
			{ elevator },
		)

		const collectionAdapter = create(
			RadioGroupCollectionDescriptor(),
			{
				props,
				// Движок снаружи: дали — фасад работает на нём, нет — соберёт свой
				options: { owner: adapter.instance, engine: props.engine },
			},
			{ bundle: adapter.bundle },
		).use(TCollectionExtension, { elevator })

		return [adapter, collectionAdapter] as const
	})

	return {
		...useCollectionAdapter(useAdapter(adapter, props), collectionAdapter, props),
		layer,
	}
}
