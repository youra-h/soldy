import type { Component } from 'svelte'
import ButtonPreview from './ButtonPreview.svelte'
import IconPreview from './IconPreview.svelte'
import ProgressSpinnerPreview from './ProgressSpinnerPreview.svelte'
import SkeletonPreview from './SkeletonPreview.svelte'

/** Пропсы превью: пропы строки, `ctrl` с экземпляром ядра и колбэки событий хоста. */
export type TPreviewProps = Record<string, unknown>

/**
 * Как рисовать компонент на стенде — в Svelte: компонент превью, который
 * раскладывает готовые пропсы (`bind`) на компонент адаптера.
 *
 * Та же карта, что у хостов Vue и React, и с теми же ключами —
 * идентификаторами реестра: содержимое не свойство, из метаданных его не
 * достать, а разметка у каждого фреймворка своя. Превью то же самое, что у
 * Vue, чтобы колонки фреймворков можно было сравнивать глазами. Разметка
 * Svelte живёт только в `.svelte`, поэтому превью — файлы, а карта — ссылки
 * на них.
 *
 * Слоёв и `frame` здесь нет: во Vue это ComponentView с чужими пропами, а в
 * Svelte чужой проп ушёл бы атрибутом в корень.
 */
export type TPreview = Component<TPreviewProps>

export const PREVIEWS: Record<string, TPreview> = {
	button: ButtonPreview,
	icon: IconPreview,
	'progress-spinner': ProgressSpinnerPreview,
	skeleton: SkeletonPreview,
}
