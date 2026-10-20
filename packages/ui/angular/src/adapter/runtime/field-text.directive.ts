import { Directive, ElementRef, Input, inject } from '@angular/core'

/**
 * FieldTextDirective — текст поля на узле: свойством, и только когда он
 * разошёлся с узлом, как `:value` у Vue, поле адаптера React и `fieldText` у
 * Svelte и Solid.
 *
 * ```html
 * <input type="text" [so-field-text]="state()['value']" />
 * <textarea [so-field-text]="state()['value']"></textarea>
 * ```
 *
 * Привязку свойства `[value]` Angular пишет в узел на каждую смену значения,
 * сверяя его с прошлым значением привязки, а не с узлом. Набранный текст
 * плагин ввода несёт в ядро, ядро — в разметку, и привязка записала бы узлу
 * его же текст на каждое нажатие. Каретку такая запись не двигает: HTML уводит
 * её в конец, только когда текст другой. Но запись из кода снимает с поля
 * пометку «изменено пользователем», и браузер перестаёт проверять `minlength`
 * и `maxlength`: поле короче `minlength` уходит с формой как верное. А набор
 * через IME она могла бы прервать.
 *
 * Поэтому текст пишет директива — сеттером входа, в том же проходе шаблона,
 * что и привязка, — и пишет, только когда текст разошёлся с узлом. Набор узлу
 * его же текст не вернёт, значение из кода дойдёт и после набора, а прочие
 * привязки поля узел не трогают вовсе. `undefined` — пустое поле, как у Vue.
 *
 * На сервере тот же сеттер пишет текст в узел эмуляции DOM, и она отдаёт его
 * атрибутом `value` разметки, а у `<textarea>` — её содержимым: атрибута
 * `value` у неё нет. При гидратации узел уже держит текст сервера, и
 * директива его не переписывает.
 *
 * Отметку и «выбрано частично» флажка разметка пишет привязками `[checked]`
 * и `[indeterminate]`: их запись, совпавшая с узлом, ничего у поля не снимает.
 *
 * Selector: input[so-field-text], textarea[so-field-text]
 */
@Directive({
	selector: 'input[so-field-text], textarea[so-field-text]',
	standalone: true,
})
export class FieldTextDirective {
	private readonly _field =
		inject<ElementRef<HTMLInputElement | HTMLTextAreaElement>>(ElementRef).nativeElement

	/** Текст поля — значение ядра; `undefined` — пусто. */
	@Input({ alias: 'so-field-text', required: true })
	set text(value: string | undefined) {
		const text = value ?? ''

		if (this._field.value !== text) this._field.value = text
	}
}
