import type { Type } from '@angular/core'

/**
 * Своё содержимое тоста в Angular (`render`) — класс компонента Angular со
 * входом `toast`: тост приходит ему этим входом (`@Input()` или `input()`), и
 * кнопка «Отменить» внутри может его закрыть (`toast().close()`). Рисует его
 * разметка тоста выводом компонента (`NgComponentOutlet`), как компонент с
 * пропом `toast` у Vue, Svelte и Solid. Ядро значение не читает, поэтому там
 * оно `unknown`, а тип ему даёт API адаптера (`useToasts()`).
 *
 * Вход по типу не проверить: у `input()` поле — сигнал, а не тост, — и
 * компонент без входа `toast` вывод Angular называет ошибкой режима
 * разработки (NG0303).
 */
export type TToastRender = Type<unknown>
