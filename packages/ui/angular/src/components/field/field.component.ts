import { Component, ChangeDetectionStrategy } from '@angular/core'
import type { IField } from '@soldy-ui/core'
import {
	AttributesDirective,
	RoleIconDirective,
	provideElevator,
	type TBinding,
} from '../../adapter'
import { TIconComponent } from '../icon'
import { FieldInputNames, TFieldSurface } from './base.component'
import { setupField } from './setup.component'

/**
 * TFieldComponent — поле формы: подпись, контрол, подсказка и ошибка,
 * связанные с контролом сами.
 *
 * Обёртки нет: корень — сам элемент потребителя, `<div so-field>`.
 * Модификаторы стороны и размера, наборы ядра и скрытие раскладывает на него
 * `TComponentBase` (стратегия `'host'`), поэтому шаблон — только части поля.
 * Своих состояний у Field нет: выключенность, только чтение и обязательность
 * тема читает с корня контрола, ошибку контрол рисует по своему
 * `data-invalid` — его пишет связка поля с контролом.
 *
 * Порядок частей один на все стороны — подпись, контрол, подсказка, ошибка:
 * сторону рисует тема. Часть стоит, пока задан её текст: ссылки контрола на
 * части ставит ядро, а слотов оно не видит. Ошибка рисуется при `invalid` и
 * встаёт на место подсказки. Что рисовать, решает ядро (`helperRendered`,
 * `errorRendered`). Наборы частей (`labelAria`, `helperAria`, `errorAria`) —
 * `id` частей и `for` подписи — кладёт директива набора
 * (`AttributesDirective`).
 *
 * Свой слой лифта поле отдаёт поддереву провайдером (`provideElevator()`):
 * связку его проводка опускает в него при сборке, а контрол в содержимом —
 * `<so-input>`, `<div so-radio-group>` — читает её из слоя при своей. DI идёт
 * по дереву объявлений, поэтому связку видит контрол, которого потребитель
 * написал внутри поля.
 *
 * `div[so-field]` стоит первым: по первому селектору Angular выбирает тег
 * хоста, когда создаёт компонент сам (`createComponent`), — это тег ядра по
 * умолчанию.
 *
 * Selector: div[so-field], [so-field]
 */
@Component({
	selector: 'div[so-field], [so-field]',
	standalone: true,
	imports: [AttributesDirective, RoleIconDirective, TIconComponent],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './field.component.html',
})
export class TFieldComponent extends TFieldSurface<IField> {
	constructor() {
		super(FieldInputNames, { strategy: 'host' })
	}

	protected createBinding(ctrl: IField | undefined, inputs: object): TBinding<IField> {
		return setupField(ctrl, inputs)
	}
}
