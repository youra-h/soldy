import type { IToastsItem } from '@soldy-ui/core'

/**
 * Своё содержимое тоста в Web Components (`render`) — функция, которая получает
 * тост и отдаёт узел: кнопку «Отменить» и подобное. Тост ей приходит
 * параметром, и кнопка внутри может его закрыть (`toast.close()`). Компонента
 * фреймворка у платформы нет, а узел — её единица разметки, как компонент с
 * пропом `toast` у Vue и Svelte. Ядро значение не читает, поэтому там оно
 * `unknown`, а тип ему даёт API адаптера (`toastsOf`).
 */
export type TToastRender = (toast: IToastsItem) => Node
