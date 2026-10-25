import type { Component, JSX } from 'solid-js'
import type { TRootProps } from '../common/root'

/** Компонент в `tag`: атрибуты корня и `ref` адаптера он кладёт на свой корень. */
export type TTagComponent = Component<
	TRootProps & { ref: (element: Element) => void; children?: JSX.Element }
>

/** Компонент Solid — функция; других функций в `tag` ядро не ждёт. */
export function isTagComponent(tag: unknown): tag is TTagComponent {
	return typeof tag === 'function'
}

/** Корень по `tag` для `Root`: строка или компонент Solid, иначе корня нет. */
export function rootTag(tag: unknown): string | TTagComponent | undefined {
	if (typeof tag === 'string' || isTagComponent(tag)) return tag

	return undefined
}
