import { Pipe, type PipeTransform } from '@angular/core'
import { toText } from '@soldy-ui/core'

/** Значение текстом по правилу ядра (`toText`): `{{ value | soText }}`. */
@Pipe({
	name: 'soText',
})
export class TextPipe implements PipeTransform {
	transform(value: unknown): string {
		return toText(value)
	}
}
