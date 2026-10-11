import type { Component, Snippet } from 'svelte'
import type { TRootAttributes } from '../common/root'

/**
 * Компонент в `tag`: его пропсы — атрибуты корня и содержимое.
 *
 * Атрибуты он кладёт на свой корень спредом — вместе с ними туда же уходит и
 * привязка корня (attachment приходит пропом с ключом-символом), — а
 * содержимое рисует внутри (`children`).
 */
export type TTagComponent = Component<TRootAttributes & { children?: Snippet }>

/**
 * Компонент ли Svelte в `tag`. Компонент Svelte 5 — функция, и других функций
 * в `tag` ядро не ждёт: строка — элемент, объект — компонент фреймворка.
 */
export function isTagComponent(tag: unknown): tag is TTagComponent {
	return typeof tag === 'function'
}
