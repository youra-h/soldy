/**
 * setupField — setup-слой Field.
 *
 * Контекст поля и его проводка (`TFieldExtension`): проводка опускает связку
 * контролу внутри лифтом (`setContext`). Контрол, смонтированный внутри,
 * прочтёт её при своей инициализации (`TFieldControlExtension`).
 *
 * Логики здесь нет: какие части видны, решает ядро, `id` частей, `for`
 * подписи и ссылки контрола на части — плагин связок.
 *
 * Принимает геттер, а не сам объект props: в Svelte 5 захват $props() в
 * переменную теряет реактивность, читать его нужно лениво. Id монтирования
 * (`$props.id()`) отдаёт компонент: компилятор пускает его только туда. Так
 * же — приёмник корня (`receive`): запись в связываемый проп `ref`
 * компонента, `$bindable` компилятор тоже пускает только в компонент.
 */

import { FieldDescriptor, TFieldExtension } from '@soldy-ui/setup'
import {
	SvelteElevatorFactory,
	createSvelteAdapterContext,
	useAdapter,
	type TRootReceiver,
} from '../../adapter'
import type { FieldProps } from './base.component'

export function setupField(getProps: () => FieldProps, mountId: string, receive: TRootReceiver) {
	const adapter = createSvelteAdapterContext(FieldDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	}).use(TFieldExtension, { elevator: SvelteElevatorFactory })

	return useAdapter(adapter, getProps, receive)
}
