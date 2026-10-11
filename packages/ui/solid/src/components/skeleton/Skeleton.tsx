import { Show, type JSX } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import { createRootProps, renderSlot, rootTag } from '../../adapter'
import { setupSkeleton } from './setup.component'
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
export function Skeleton(props: SkeletonProps): JSX.Element {
	const binding = setupSkeleton(props)
	const state = binding.state
	// Наборы ядра, поверх — атрибуты снаружи, `ref` адаптера последним.
	// Видимость в раскладку корня не идёт: она прячет заглушку
	const root = createRootProps(() => ({
		state: { classes: state.classes, layout_styles: state.layout_styles },
		sets: [state.attrs, state.aria],
		forward: binding.forwardProps(),
	}))

	return (
		<Dynamic {...root()} component={rootTag(state.tag)} ref={binding.ref}>
			<Show when={state.present}>
				<div class="s-skeleton__placeholder" aria-hidden="true" />
			</Show>
			{renderSlot(props.children)}
		</Dynamic>
	)
}
