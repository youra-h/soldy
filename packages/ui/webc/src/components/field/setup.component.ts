import { FieldDescriptor, TFieldExtension } from '@soldy-ui/setup'
import type { IField } from '@soldy-ui/core'
import { createWebcAdapterContext, useAdapter } from '../../adapter'
import type { TBinding, TUpdateListener } from '../../adapter'
import { createWebcElevator } from '../../adapter/elevator'

/** Связку поле опускает лифтом хоста; контрол в свете находит её вверх по документу. */
export function setupField(
	host: HTMLElement,
	ctrl: IField | undefined,
	props: Record<string, unknown>,
	onUpdate: TUpdateListener,
): TBinding<IField> {
	const adapter = createWebcAdapterContext(host, FieldDescriptor(), { ctrl, props }).use(
		TFieldExtension,
		{ elevator: createWebcElevator(host) },
	)

	return useAdapter(adapter, host, onUpdate)
}
