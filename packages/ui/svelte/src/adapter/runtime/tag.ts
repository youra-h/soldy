import type { Component, Snippet } from 'svelte'
import type { TRootNodeAttributes } from '../common/root'

/**
 * Компонент в `tag`: его пропсы — атрибуты корня и содержимое.
 *
 * Атрибуты он кладёт на свой корень спредом — вместе с ними туда же уходят и
 * attachment-ы адаптера (они приходят пропами с ключом-символом): привязка
 * корня и, в браузере, стиль корня по свойствам; строкой `style` приходит
 * только при серверном рендере. Содержимое он рисует внутри (`children`).
 */
export type TTagComponent = Component<TRootNodeAttributes & { children?: Snippet }>

/**
 * Компонент ли Svelte в `tag`. Компонент Svelte 5 — функция, и других функций
 * в `tag` ядро не ждёт: строка — элемент, объект — компонент фреймворка.
 */
export function isTagComponent(tag: unknown): tag is TTagComponent {
	return typeof tag === 'function'
}
