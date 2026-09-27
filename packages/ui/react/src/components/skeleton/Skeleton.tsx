import type { ElementType, ReactElement } from 'react'
import { renderSlot, toRootProps } from '../../adapter'
import { useSetupSkeleton } from './setup.component'
import type { SkeletonProps } from './base.component'

/**
 * Skeleton — заглушка поверх будущего содержимого.
 *
 * Корень есть всегда: в нём лежит содержимое (`children`), а `rendered` и
 * `visible` решают только, показана ли заглушка (`present`). Поэтому
 * видимость в раскладку корня не передаётся — скрыть его она не должна.
 *
 * Заглушка декоративна: она изображает будущий текст, а не является им.
 * `aria-hidden` стоит на ней, а не на корне — скрывать содержимое нельзя.
 * Пока заглушка показана, ядро помечает корень `aria-busy`.
 */
export function Skeleton(props: SkeletonProps): ReactElement {
	const { ref, forwardProps, state } = useSetupSkeleton(props)

	const { tag, classes, layout_styles, present, aria, attrs } = state

	const Tag = tag as ElementType

	// Наборы ядра, поверх — атрибуты снаружи, `ref` адаптера последним
	// (`toRootProps`). Видимость в раскладку корня не идёт: она прячет заглушку
	return (
		<Tag {...toRootProps(ref, { classes, layout_styles }, [attrs, aria], forwardProps)}>
			{present ? <div className="s-skeleton__placeholder" aria-hidden="true" /> : null}
			{renderSlot(props.children)}
		</Tag>
	)
}
