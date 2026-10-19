/**
 * useSetupField — setup-слой Field (аналог setup.component.ts во Vue).
 *
 * Сборка — `useAdapterContext`: контекст поля и его проводка
 * (`TFieldExtension`), которая опускает связку контролу внутри лифтом
 * компонента. Детям слой лифта (`layer`) отдаёт `Elevate` в разметке.
 *
 * Логики здесь нет: какие части видны, решает ядро, `id` частей, `for`
 * подписи и ссылки контрола на части — плагин связок, а контрол берёт связку
 * своим расширением (`TFieldControlExtension`).
 */

import { FieldDescriptor, TFieldExtension } from '@soldy-ui/setup'
import { useAdapter, useAdapterContext } from '../../adapter'
import type { FieldProps } from './base.component'

export function useSetupField(props: FieldProps) {
	const { contexts: adapter, layer } = useAdapterContext((create, elevator) =>
		create(FieldDescriptor(), { ctrl: props.ctrl, props }).use(TFieldExtension, { elevator }),
	)

	return { ...useAdapter(adapter, props), layer }
}
