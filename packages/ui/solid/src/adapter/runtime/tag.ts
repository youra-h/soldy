import type { Component, JSX } from 'solid-js'
import type { TRootProps } from '../common/root'

/**
 * Компонент в `tag`: его пропсы — атрибуты корня, `ref` адаптера и
 * содержимое.
 *
 * Всё это он кладёт на свой корень спредом — `ref` спред Solid вызывает с
 * узлом сам, — а содержимое рисует внутри (`children`). Без `ref` не придёт
 * `element:ready`, без класса и стиля — вид, без ARIA — доступность.
 */
export type TTagComponent = Component<
	TRootProps & { ref: (element: Element) => void; children?: JSX.Element }
>

/**
 * Компонент ли Solid в `tag`. Компонент Solid — функция, и других функций в
 * `tag` ядро не ждёт: строка — элемент, объект — компонент фреймворка.
 */
export function isTagComponent(tag: unknown): tag is TTagComponent {
	return typeof tag === 'function'
}

/**
 * Корень по `tag` — то, что рисует `Dynamic`: строка — элемент с этим именем,
 * компонент Solid (SVG-иконка приложения, иконка по роли `roleIcon`) — сам
 * компонент. Другого объекта Solid нарисовать не может — корня у компонента
 * нет (`undefined`), как у `<component :is>` Vue без компонента.
 */
export function rootTag(tag: unknown): string | TTagComponent | undefined {
	if (typeof tag === 'string' || isTagComponent(tag)) return tag

	return undefined
}
