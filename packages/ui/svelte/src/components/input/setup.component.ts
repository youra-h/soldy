/**
 * setupInput — setup-слой Input.
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
 *
 * Поле формы `Field` над полем: ошибку, `id` и ссылки на части контрол
 * берёт от него своим расширением (`TFieldControlExtension`) лифтом
 * (`getContext`), а своему содержимому опускает пустую связку
 * (`setContext`): контролы в его слотах — его содержимое.
 */

import { InputDescriptor, TFieldControlExtension } from '@soldy-ui/setup'
import {
	SvelteElevatorFactory,
	createSvelteAdapterContext,
	useAdapter,
	type TRootReceiver,
} from '../../adapter'
import type { InputProps } from './base.component'

export function setupInput(getProps: () => InputProps, mountId: string, receive: TRootReceiver) {
	const adapter = createSvelteAdapterContext(InputDescriptor(), {
		ctrl: getProps().ctrl,
		props: getProps(),
		mountId,
	}).use(TFieldControlExtension, { elevator: SvelteElevatorFactory })

	// Текст в ядро несёт плагин ввода по `input` поля, имя кнопки очистки
	// (`clearAria`) пишет плагин имён формы по локали поддерева
	return useAdapter(adapter, getProps, receive)
}
