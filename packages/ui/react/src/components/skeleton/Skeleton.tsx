import type { ElementType, ReactElement } from 'react'
import { renderSlot, toAriaProps, toRootLayout } from '../../adapter'
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

	// forwardProps идёт ПЕРВЫМ, чтобы не перекрыть ref адаптера (см. Button)
	return (
		<Tag
			{...forwardProps}
			ref={ref}
			{...toRootLayout({ classes, layout_styles }, forwardProps)}
			{...toAriaProps(attrs)}
			{...toAriaProps(aria)}
		>
			{present ? <div className="s-skeleton__placeholder" aria-hidden="true" /> : null}
			{renderSlot(props.children)}
		</Tag>
	)
}
