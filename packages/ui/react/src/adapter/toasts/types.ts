import type { ComponentType } from 'react'
import type { IToastsItem } from '@soldy-ui/core'

/**
 * Своё содержимое тоста в React (`render`) — компонент React, которому тост
 * приходит пропом `toast`: кнопка «Отменить» внутри может его закрыть
 * (`toast.close()`). Компонент — функция, класс или объект-компонент (`memo`,
 * `forwardRef`, `lazy`), но не готовый элемент: тост рисует его сам и сам
 * отдаёт ему проп. Ядро значение не читает, поэтому там оно `unknown`, а тип
 * ему даёт API адаптера (`useToasts()`), как `TToastRender` у Vue, Svelte и
 * Solid.
 */
export type TToastRender = ComponentType<{ toast: IToastsItem }>
