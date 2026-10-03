import type { ElementType, ReactElement } from 'react'
import { Teleport, renderSlot, toRootProps } from '../../adapter'
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
 * `contained` выключает телепорт: панель рисуется на месте и встаёт в
 * ближайшем позиционированном предке.
 */
export function Frame(props: FrameProps): ReactElement | null {
	const { ref, forwardProps, state } = useSetupFrame(props)

	const { rendered, tag, target, contained, aria, dataset, attrs } = state

	if (!rendered) return null

	const Tag = tag as ElementType

	// Наборы ядра, поверх — атрибуты снаружи, `ref` адаптера последним (`toRootProps`)
	return (
		<Teleport to={target} disabled={contained}>
			<Tag {...toRootProps(ref, state, [attrs, aria, dataset], forwardProps)}>
				{renderSlot(props.children)}
			</Tag>
		</Teleport>
	)
}
