import type { Component } from 'vue'
import type { IToastsItem } from '@soldy-ui/core'

/**
 * Своё содержимое тоста во Vue (`render`) — компонент, которому тост приходит
 * пропом `toast`: кнопка «Отменить» внутри может его закрыть
 * (`toast.close()`). Ядро значение не читает, поэтому там оно `unknown`, а
 * тип ему даёт API адаптера (`useToasts()`).
 */
export type TToastRender = Component<{ toast: IToastsItem }>
