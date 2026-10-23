import type { Component, Snippet } from 'svelte'
import type { TRootNodeAttributes } from '../common/root'

/**
 * Компонент в `tag`: атрибуты корня — пропсами, вместе с attachment-ами
 * адаптера под ключами-символами; он кладёт их спредом на свой корень.
 */
export type TTagComponent = Component<TRootNodeAttributes & { children?: Snippet }>

/** Компонент Svelte 5 — функция; других функций в `tag` ядро не ждёт. */
export function isTagComponent(tag: unknown): tag is TTagComponent {
	return typeof tag === 'function'
}
