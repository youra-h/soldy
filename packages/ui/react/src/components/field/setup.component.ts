import { FieldDescriptor, TFieldExtension } from '@soldy-ui/setup'
import { useComponent } from '../../adapter'
import type { FieldProps } from './base.component'

/** Проводка поля (`TFieldExtension`) опускает связку контролу внутри лифтом. */
export function useSetupField(props: FieldProps) {
	return useComponent(
		(create, elevator) =>
			create(FieldDescriptor(), { ctrl: props.ctrl, props }).use(TFieldExtension, {
				elevator,
			}),
		props,
	)
}
