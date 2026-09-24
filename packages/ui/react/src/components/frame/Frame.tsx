import type { ElementType, ReactElement } from 'react'
import { Teleport, renderSlot, toAriaProps, toRootLayout } from '../../adapter'
import { useSetupFrame } from './setup.component'
import type { FrameProps } from './base.component'

/**
 * Frame — слой поверх страницы: корень уходит телепортом в цель `target`
 * (по умолчанию `body`), и на нём же лежит всё остальное — три набора ядра,
 * раскладка (`position`, координаты, `z-index` слоя) и проброшенные пропсы
 * потребителя. Как во Vue, где у Frame `inheritAttrs: false` и атрибуты
 * переносятся на узел внутри телепорта вручную.
 *
 * Показанный Frame получает номер слоя: он же `z-index` раскладки и
 * `data-layer` набора `dataset`, по нему плагины оверлея узнают вложенность.
 *
 * На сервере телепорта нет — узел появляется после гидратации (см. `Teleport`).
 */
export function Frame(props: FrameProps): ReactElement | null {
	const { ref, forwardProps, state } = useSetupFrame(props)

	const { rendered, tag, target, aria, dataset, attrs } = state

	if (!rendered) return null

	const Tag = tag as ElementType

	// forwardProps идёт ПЕРВЫМ, чтобы не перекрыть ref адаптера (см. Button)
	return (
		<Teleport to={target}>
			<Tag
				{...forwardProps}
				ref={ref}
				{...toRootLayout(state, forwardProps)}
				{...toAriaProps(attrs)}
				{...toAriaProps(aria)}
				{...toAriaProps(dataset)}
			>
				{renderSlot(props.children)}
			</Tag>
		</Teleport>
	)
}
