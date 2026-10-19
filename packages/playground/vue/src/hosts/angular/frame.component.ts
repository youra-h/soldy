import { ChangeDetectionStrategy, Component, input } from '@angular/core'

/**
 * Рамка превью — разметка без компонента вокруг компонента превью: граница
 * ширины, окно прокрутки, как `div` вокруг Table у хостов Vue и React.
 *
 * Рамка — компонент хоста, а не узел, который хост вставил бы сам: её ставит
 * и снимает Angular, как обёртку-компонент адаптера (`TWrapper`), а компонент
 * превью стоит в её проекции. Стиль — вход (`frame`), а не статика: у таблицы
 * с закреплённой шапкой рамка — ещё и окно прокрутки, и смена пропа строки
 * меняет его на лету. Тег — `div`, первым селектором: так Angular строит хост
 * сам, и рамка ложится в ячейку оболочки тем же блоком, что у соседей.
 */
@Component({
	selector: 'div[pg-angular-frame]',
	changeDetection: ChangeDetectionStrategy.OnPush,
	host: { '[style]': 'frame()' },
	template: '<ng-content />',
})
export class PreviewFrameComponent {
	/** Стиль рамки строкой CSS. */
	readonly frame = input.required<string>()
}
