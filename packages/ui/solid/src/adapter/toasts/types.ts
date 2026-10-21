import type { Component } from 'solid-js'
import type { IToastsItem } from '@soldy-ui/core'

/**
 * Своё содержимое тоста в Solid (`render`) — компонент Solid, которому тост
 * приходит пропом `toast`: кнопка «Отменить» внутри может его закрыть
 * (`toast.close()`). Ядро значение не читает, поэтому там оно `unknown`, а
 * тип ему даёт API адаптера (`useToasts()`), как `TToastRender` у Vue и
 * Svelte.
 */
export type TToastRender = Component<{ toast: IToastsItem }>
