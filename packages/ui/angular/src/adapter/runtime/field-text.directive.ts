import { Directive, ElementRef, Input, inject } from '@angular/core'

/**
 * Текст поля — только когда он разошёлся с узлом: `[value]` сверяет с прошлой
 * привязкой, а не с узлом, и писал бы полю его же текст на каждое нажатие.
 * Такая запись снимает с поля пометку «изменено пользователем», и браузер
 * перестаёт проверять `minlength`. AGENTS.md (Angular), «Текст поля».
 */
@Directive({
	selector: 'input[so-field-text], textarea[so-field-text]',
	standalone: true,
})
export class FieldTextDirective {
	private readonly _field =
		inject<ElementRef<HTMLInputElement | HTMLTextAreaElement>>(ElementRef).nativeElement

	@Input({ alias: 'so-field-text', required: true })
	set text(value: string | undefined) {
		const text = value ?? ''

		if (this._field.value !== text) this._field.value = text
	}
}
