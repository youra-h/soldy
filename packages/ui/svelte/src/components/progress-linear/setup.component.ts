/**
 * setupProgressLinear — setup-слой ProgressLinear.
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

import { ProgressLinearDescriptor } from '@soldy-ui/setup'
import { createSvelteAdapterContext, useAdapter, type TRootReceiver } from '../../adapter'
import type { ProgressLinearProps } from './base.component'

export function setupProgressLinear(
	getProps: () => ProgressLinearProps,
	mountId: string,
	receive: TRootReceiver,
) {
	const adapter = createSvelteAdapterContext(ProgressLinearDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	})

	// Логики здесь нет: долю, `aria-value*`, `data-indeterminate` и
	// модификатор оси считает ядро, бег рисует тема. Выход `percentStyle`
	// разметка кладёт в стиль корня
	return useAdapter(adapter, getProps, receive)
}
