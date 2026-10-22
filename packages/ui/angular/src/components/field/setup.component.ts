import { FieldDescriptor, TFieldExtension } from '@soldy-ui/setup'
import type { IField } from '@soldy-ui/core'
import { AngularElevatorFactory, createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

/** Связку контролу внутри проводка поля (`TFieldExtension`) опускает лифтом. */
export function setupField(ctrl: IField | undefined, props: object): TBinding<IField> {
	const adapter = createAngularAdapterContext(FieldDescriptor(), { ctrl, props }).use(
		TFieldExtension,
		{ elevator: AngularElevatorFactory },
	)

	return useAdapter(adapter)
}
