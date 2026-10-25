import type { JSX } from 'solid-js'
import {
	Root,
	Teleport,
	createPartProps,
	createRootProps,
	renderSlot,
	resolveSlot,
	roleIcon,
} from '../../adapter'
import { Show } from '../../adapter/runtime/flow'
import { Button } from '../button'
import { Icon } from '../icon'
import { setupDialog } from './setup.component'
import type { DialogProps } from './base.component'

/** Иконки кнопок шапки по умолчанию. */
const CLOSE = roleIcon('close')
const MAXIMIZE = roleIcon('arrowsOutward')
const RESTORE = roleIcon('arrowsInward')

/** Класс подложки — её разметка: своего экземпляра у подложки нет. */
const BACKDROP = ['so-dialog__backdrop']

/**
 * Модальное окно: подложка и панель — соседи в телепорте, подложка раньше; корень — панель.
 * Кнопки шапки — после подвала: в строку заголовка их переносит тема.
 */
export function Dialog(props: DialogProps): JSX.Element {
	const binding = setupDialog(props)
	const state = binding.state
	const ctrl = binding.ctrl
	const backdrop = createRootProps(() => ({
		state: {
			classes: BACKDROP,
			layout_styles: state.layout_backdropStyles,
			visible: state.visible,
		},
		sets: [state.backdropDataset],
		forward: {},
	}))
	const panel = createRootProps(() => ({
		state,
		sets: [state.attrs, state.aria, state.dataset, state.dismiss_ownerAttribute],
		forward: binding.forwardProps(),
	}))
	const titleAria = createPartProps(() => state.titleAria)
	const bodyAria = createPartProps(() => state.bodyAria)
	const maximizeIcon = resolveSlot(
		() => props['maximize-icon'],
		() => ({}),
	)
	const restoreIcon = resolveSlot(
		() => props['restore-icon'],
		() => ({}),
	)
	const closeIcon = resolveSlot(
		() => props['close-icon'],
		() => ({}),
	)

	return (
		<Show when={state.rendered}>
			<Teleport to={state.target}>
				<div {...backdrop()} />
				<Root
					tag={state.tag}
					attributes={() => ({ tabindex: '-1', ...panel() })}
					ref={binding.ref}
				>
					<h2 class="so-dialog__title" {...titleAria()}>
						{renderSlot(props.title)}
					</h2>
					<div class="so-dialog__body" {...bodyAria()}>
						{renderSlot(props.children)}
					</div>
					<div class="so-dialog__footer">{renderSlot(props.footer)}</div>
					<Button
						embedded="dialog.maximize"
						type="button"
						class="so-dialog__maximize"
						rendered={state.maximizable}
						onClick={() => ctrl.toggleMaximized()}
						{...state.maximizeAria}
					>
						<Show
							when={state.maximized}
							fallback={
								maximizeIcon() ?? (
									<Icon embedded="dialog.maximize-icon" tag={MAXIMIZE} />
								)
							}
						>
							{restoreIcon() ?? <Icon embedded="dialog.restore-icon" tag={RESTORE} />}
						</Show>
					</Button>
					<Button
						embedded="dialog.close"
						type="button"
						class="so-dialog__close"
						rendered={state.closable}
						onClick={() => ctrl.requestClose('button')}
						{...state.closeAria}
					>
						{closeIcon() ?? <Icon embedded="dialog.close-icon" tag={CLOSE} />}
					</Button>
				</Root>
			</Teleport>
		</Show>
	)
}
