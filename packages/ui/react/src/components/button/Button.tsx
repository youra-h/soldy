import type { ElementType, ReactElement } from 'react'
import { renderSlot, toRootProps } from '../../adapter'
import { useSetupButton } from './setup.component'
import type { ButtonProps } from './base.component'

/**
 * Button — рендерит кнопку с текстом из Core.
 *
 * - `tag` по умолчанию `button` (из TButton.defaultValues)
 * - disabled → нативный атрибут `disabled` там, где тег его поддерживает
 *   (`attrs`), иначе `aria-disabled` (`aria`) — оба набора считает ядро;
 *   `data-disabled` для темы (`dataset`) стоит на любом теге
 *
 * Слоты объявлены в контракте (ButtonDescriptor) и одинаковы во всех
 * адаптерах: `leading`, `default` (здесь — `children`, со scope `{ text }`),
 * `trailing`.
 */
export function Button(props: ButtonProps): ReactElement | null {
	const { ref, forwardProps, state } = useSetupButton(props)

	const { rendered, tag, text, aria, dataset, attrs } = state

	if (!rendered) return null

	const Tag = tag as ElementType

	// Наборы ядра, поверх — атрибуты снаружи, `ref` адаптера последним
	// (`toRootProps`): `tabindex="-1"` строки списка перекрывает `tabindex="0"`,
	// который кнопка на `div` ставит себе сама
	return (
		<Tag {...toRootProps(ref, state, [attrs, aria, dataset], forwardProps)}>
			{renderSlot(props.leading)}
			<span className="s-button__text">
				{renderSlot(props.children, { text: text ?? '' }) ?? text}
			</span>
			{renderSlot(props.trailing)}
		</Tag>
	)
}
