import { FieldDescriptor, TFieldExtension } from '@soldy-ui/setup'
import type { IField } from '@soldy-ui/core'
import { AngularElevatorFactory, createAngularAdapterContext, useAdapter } from '../../adapter'
import type { TBinding } from '../../adapter'

/**
 * setupField — setup-слой Field: собирает компонент
 * (`createAngularAdapterContext`) и связывает его с Angular через useAdapter.
 *
 * Проводка поля (`TFieldExtension`) опускает связку контролу внутри лифтом —
 * в слой поля (`provideElevator()` в его `providers`). Сборка — в `ngOnInit`
 * поля, а он идёт раньше хуков его содержимого: контрол, собранный внутри,
 * прочтёт связку при своей (`TFieldControlExtension`).
 *
 * Логики здесь нет: какие части видны, решает ядро, `id` частей, `for`
 * подписи и ссылки контрола на части — плагин связок.
 */
export function setupField(ctrl: IField | undefined, props: object): TBinding<IField> {
	const adapter = createAngularAdapterContext(FieldDescriptor(), { ctrl, props }).use(
		TFieldExtension,
		{ elevator: AngularElevatorFactory },
	)

	return useAdapter(adapter)
}
