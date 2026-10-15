import { Show, type JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { createRootProps, renderSlot, resolveSlot, rootTag } from '../../adapter'
import { setupButton } from './setup.component'
import type { ButtonProps } from './base.component'

/**
 * Button — рендерит кнопку с текстом из Core.
 *
 * - `tag` по умолчанию `button` (из TButton.defaultValues)
 * - disabled → нативный атрибут `disabled` там, где тег его поддерживает
 *   (`attrs`), иначе `aria-disabled` (`aria`) — оба набора считает ядро;
 *   `data-disabled` для темы (`dataset`) стоит на любом теге
 *
 * Наборы ядра, поверх — атрибуты снаружи (`createRootProps`), `ref` адаптера
 * последним: `tabindex="-1"` строки списка перекрывает `tabindex="0"`, который
 * кнопка на `div` ставит себе сама.
 *
 * Слоты объявлены в контракте (ButtonDescriptor) и одинаковы во всех
 * адаптерах: `leading`, `default` (здесь — `children`, со scope `{ text }`),
 * `trailing`. Незаданный `children` уступает место тексту: по нему разметка
 * выбирает, что рисовать, поэтому слот разворачивает адаптер, один раз
 * (`resolveSlot`).
 */
export function Button(props: ButtonProps): JSX.Element {
	const binding = setupButton(props)
	const state = binding.state
	const root = createRootProps(() => ({
		state,
		sets: [state.attrs, state.aria, state.dataset],
		forward: binding.forwardProps(),
	}))
	const content = resolveSlot(
		() => props.children,
		() => ({ text: state.text ?? '' }),
	)

	return (
		<Show when={state.rendered}>
			<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
				{renderSlot(props.leading)}
				<span class="so-button__text">{content() ?? state.text}</span>
				{renderSlot(props.trailing)}
			</Dynamic>
		</Show>
	)
}
