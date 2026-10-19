/**
 * setupField — setup-слой Field.
 *
 * Контекст поля и его проводка (`TFieldExtension`): проводка опускает связку
 * контролу внутри в слой лифта поля (`useElevator`), детям его отдаёт
 * `Elevate` в разметке. Контрол, собранный внутри, прочтёт связку при своей
 * сборке (`TFieldControlExtension`).
 *
 * Логики здесь нет: какие части видны, решает ядро, `id` частей, `for`
 * подписи и ссылки контрола на части — плагин связок.
 */

import { FieldDescriptor, TFieldExtension } from '@soldy-ui/setup'
import { createSolidAdapterContext, useAdapter, useElevator } from '../../adapter'
import type { FieldProps } from './base.component'

export function setupField(props: FieldProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(FieldDescriptor(), {
		ctrl: props.ctrl,
		props,
	}).use(TFieldExtension, { elevator })

	return { ...useAdapter(adapter, props), layer }
}
