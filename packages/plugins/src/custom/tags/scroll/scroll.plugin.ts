import type { ITags } from '@soldy-ui/core'
import { TBasePlugin } from '../../../base'
import type { IPluginContext } from '../../../base'
import { TElementPlugin } from '../../element'
import { itemOf, nearestShift, scrollWindowOf } from '../../../utils'
import type { IDomEventTarget } from '../../../utils'
import type { TTagsScrollPluginEvents } from './types'

/**
 * TTagsScrollPlugin — brings the focused element of a `scroll` tags row into
 * view.
 *
 * A `scroll` row scrolls by itself, and at its edge the focused element stayed
 * cut: a partly visible one the browser doesn't scroll to on focus at all, a
 * fully hidden one it centres — and then its tag stays cut. So on `focusin`
 * the plugin brings the focused tag into the row's window: the padding box
 * without `scroll-padding` (`scrollWindowOf`). How much room to keep at the
 * edge only the theme knows — the focus ring's margin in a standalone row, the
 * fade's width in a Select field. The arithmetic is shared with the scroller
 * (`nearestShift`, `TScrollerViewportPlugin`).
 *
 * A plugin, not an extension or markup: boxes and scrolling are DOM
 * operations. Decisions:
 * - the tag — the row's direct child — goes into the window, not just the
 *   focused element. Focus lands on the tag's line or its close button, while
 *   in selection mode the ring is drawn by the pill: with the line in the
 *   window and the pill past the edge, the ring and the close button stayed
 *   cut, and a close button without its label doesn't tell which tag it
 *   closes. A tag wider than the window covers it, with the focused element
 *   inside;
 * - the shift is the nearest one that puts the tag in the window, not start to
 *   start as in the scroller: the row has no snap;
 * - keyboard focus only (`:focus-visible`). The browser doesn't scroll to the
 *   focus of a mouse press either, and rightly: had the row moved between the
 *   press and the release, another tag would be under the pointer, and `click`
 *   would miss;
 * - the shift is synchronous, right in the handler, and instant, as in the
 *   scroller. The browser's own scroll to focus is instant too and would cut a
 *   smooth one short. On Tab it scrolls before `focusin`, after `focus()` —
 *   right after it, and after our shift it has nothing left to do.
 *
 * The plugin is the only path that brings a tag in: on entering the set by
 * Tab and after `focus()` of the keyboard plugin (`TTagsKeyboardPlugin`:
 * arrows, `Home`/`End`, the neighbour of a closed tag). The keyboard plugin
 * doesn't scroll by itself: `focus()` after a key press the browser counts as
 * keyboard focus, and `focusin` comes here with `:focus-visible`.
 *
 * Listens only while `overflow === 'scroll'`: in `wrap` the row doesn't
 * scroll. The mode is expressed by the subscription, not by a check in the
 * handler.
 */
export class TTagsScrollPlugin extends TBasePlugin<ITags, TTagsScrollPluginEvents> {
	/** The set's root: in `scroll` it is the scrolling row. */
	private _root: Element | null = null
	/** The node the listener is on now; `null` — it isn't on any. */
	private _listening: IDomEventTarget | null = null
	private _owner: ITags | null = null

	override install(ctx: IPluginContext): void {
		super.install(ctx)

		this._owner = ctx.getInstance<ITags>()

		const element = ctx.get(TElementPlugin)

		element?.events.on('ready', (node) => {
			this._root = node
			this._syncListener()
		})

		element?.events.on('removed', () => {
			this._root = null
			this._syncListener()
		})

		this._listenTo(this._owner?.events, 'change:overflow', this._onOverflowChange)
	}

	override destroy(): void {
		this._root = null
		this._syncListener()
		this._owner = null

		super.destroy()
	}

	private readonly _onOverflowChange = (): void => this._syncListener()

	/** The listener is on the root while there is a node and the row scrolls by itself. */
	private _syncListener(): void {
		const target: IDomEventTarget | null =
			this._owner?.overflow === 'scroll' ? this._root : null

		if (target === this._listening) return

		this._listening?.removeEventListener('focusin', this._onFocusIn)

		this._listening = target

		target?.addEventListener('focusin', this._onFocusIn)
	}

	/**
	 * Keyboard focus came into the row — bring its tag into the window (why —
	 * in the class description).
	 *
	 * The row itself is a Tab stop when it has none of its own: the browser
	 * makes one of a scrolling area. It is the window, and there is nowhere to
	 * bring it.
	 */
	private readonly _onFocusIn = (event: FocusEvent): void => {
		const root = this._root
		const target = event.target

		if (!root || !(target instanceof Element) || target === root) return

		if (!target.matches(':focus-visible')) return

		const shift = nearestShift({
			scrollWindow: scrollWindowOf(root, getComputedStyle(root)),
			focused: target.getBoundingClientRect(),
			item: itemOf(target, root).getBoundingClientRect(),
		})

		if (shift !== null) root.scrollBy({ left: wholePixels(shift), behavior: 'instant' })
	}
}

/**
 * The shift in whole pixels, rounded away from zero. WebKit keeps the scroll
 * position in whole pixels and truncates a fractional target toward zero: the
 * tag stopped short of the window by under a pixel, and the row keeps exactly
 * the focus ring's width at its edge, so the ring was cut. From a whole
 * position the target stays whole, and in both engines the row moves no less
 * than the tag needs. The arithmetic (`nearestShift`) stays exact.
 */
function wholePixels(shift: number): number {
	return Math.sign(shift) * Math.ceil(Math.abs(shift))
}
