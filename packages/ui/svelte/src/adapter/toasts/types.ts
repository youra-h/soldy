import type { Component } from 'svelte'
import type { IToastsItem } from '@soldy-ui/core'

/**
 * Своё содержимое тоста в Svelte (`render`) — компонент Svelte, которому тост
 * приходит пропом `toast`: кнопка «Отменить» внутри может его закрыть
 * (`toast.close()`). Ядро значение не читает, поэтому там оно `unknown`, а
 * тип ему даёт API адаптера (`useToasts()`), как `TToastRender` у Vue.
 */
export type TToastRender = Component<{ toast: IToastsItem }>
