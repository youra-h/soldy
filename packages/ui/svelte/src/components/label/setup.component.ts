/**
 * setupLabel — setup-слой Label.
 *
 * Создаёт adapter-context (`createSvelteAdapterContext`) и связывает его со
 * Svelte через useAdapter. Вызывается один раз при инициализации компонента,
 * поэтому контекст достаточно положить в обычную константу.
 *
 * Принимает геттер, а не сам объект props: в Svelte 5 захват $props() в
 * переменную теряет реактивность, читать его нужно лениво. Id монтирования
 * (`$props.id()`) отдаёт компонент: компилятор пускает его только туда. Так
 * же — приёмник корня (`receive`): запись в связываемый проп `ref`
 * компонента, `$bindable` компилятор тоже пускает только в компонент.
 */

import { LabelDescriptor } from '@soldy-ui/setup'
import { createSvelteAdapterContext, useAdapter, type TRootReceiver } from '../../adapter'
import type { LabelProps } from './base.component'

export function setupLabel(getProps: () => LabelProps, mountId: string, receive: TRootReceiver) {
	const adapter = createSvelteAdapterContext(LabelDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	})

	return useAdapter(adapter, getProps, receive)
}
