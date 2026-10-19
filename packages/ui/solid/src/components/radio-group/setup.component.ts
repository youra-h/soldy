/**
 * setupRadioGroup — setup-слой RadioGroup.
 *
 * Два контекста, как у Vue и Svelte: свой (`RadioGroupDescriptor`) и фасада
 * коллекции (`RadioGroupCollectionDescriptor`) на общем наборе. Оба
 * собираются один раз, при выполнении тела компонента; фасад делит набор
 * группы, и id монтирования у него группы — от него общий `name` радио, когда
 * своего имени у группы нет.
 *
 * Расширение коллекции опускает движок и регистратор радио в слой лифта
 * группы (`useElevator`), детям его отдаёт `Elevate` в разметке: радио,
 * смонтированное внутри, войдёт в коллекцию группы при своей сборке.
 * Drag-and-drop нет, как у Vue: радио одной группы стоят где угодно в
 * разметке, и порядка на экране у них нет.
 *
 * Состояние у контекстов своё, а разметка читает его одним видом
 * (`joinState`); атрибуты корня — то, что не съели ни группа, ни фасад.
 *
 * Поле формы `Field` связывается с группой, а не с радио: подпись поля
 * называет группу ссылкой, ошибка — группы (`TFieldControlExtension` на
 * своём контексте). Своему содержимому группа опускает пустую связку в тот же
 * слой: радио и контролы в их подписях связку поля не берут.
 */

import {
	RadioGroupCollectionDescriptor,
	RadioGroupDescriptor,
	TCollectionExtension,
	TFieldControlExtension,
} from '@soldy-ui/setup'
import {
	createSolidAdapterContext,
	joinState,
	useAdapter,
	useCollectionAdapter,
	useElevator,
} from '../../adapter'
import type { RadioGroupProps } from './base.component'

export function setupRadioGroup(props: RadioGroupProps) {
	const { elevator, layer } = useElevator()
	const adapter = createSolidAdapterContext(RadioGroupDescriptor(), {
		ctrl: props.ctrl,
		props,
	}).use(TFieldControlExtension, { elevator })
	const owner = useAdapter(adapter, props)

	const collectionAdapter = createSolidAdapterContext(
		RadioGroupCollectionDescriptor(),
		{
			props,
			// Готовая коллекция снаружи. Дали — фасад работает на ней и своей
			// не создаёт, лишь доложит недостающие расширения в неё же.
			// Не дали — соберёт свою. Развилка в `completeEngine`
			options: { owner: adapter.instance, engine: props.engine },
		},
		{ bundle: adapter.bundle },
	).use(TCollectionExtension, { elevator })

	const collectionBinding = useCollectionAdapter(collectionAdapter, props, owner.forwardProps)

	return {
		ctrl: owner.ctrl,
		plugins: owner.plugins,
		ref: owner.ref,
		state: joinState(owner.state, collectionBinding.state),
		forwardProps: collectionBinding.forwardProps,
		layer,
	}
}
