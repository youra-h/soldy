import { Component, ChangeDetectionStrategy } from '@angular/core'
import type { ITextarea } from '@soldy-ui/core'
import { AttributesDirective, FieldTextDirective, provideElevator } from '../../adapter'
import { TTextareaSurface } from '../../generated/textarea.metadata'
import { setupTextarea } from './setup.component'

/**
 * Многострочное поле: `<textarea>` внутри корня, под ним — счётчик символов.
 * На саму `<textarea>` компонент не встаёт: шаблон в поле с текстом не отрисуется.
 * AGENTS.md (Angular), «Поле: атрибуты потребителя делятся между корнем и `<input>`».
 */
@Component({
	selector: 'div[so-textarea], [so-textarea]',
	imports: [AttributesDirective, FieldTextDirective],
	providers: [provideElevator()],
	changeDetection: ChangeDetectionStrategy.OnPush,
	templateUrl: './textarea.component.html',
})
export class TTextareaComponent extends TTextareaSurface<ITextarea> {
	constructor() {
		super(setupTextarea, { strategy: 'host', sets: ['attrs', 'dataset'], control: true })
	}
}
