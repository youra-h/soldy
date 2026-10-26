import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { MatButton } from '@angular/material/button'
import { MatDialog, MatDialogModule } from '@angular/material/dialog'
import { MatFormFieldModule } from '@angular/material/form-field'
import { MatInputModule } from '@angular/material/input'

/** The dialog's content — a component, as the docs of `MatDialog` open it. */
@Component({
	selector: 'bench-dialog-content',
	imports: [MatDialogModule, MatButton, MatFormFieldModule, MatInputModule],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `
		<h2 mat-dialog-title>Настройки</h2>
		<mat-dialog-content>
			<p style="margin: 0 0 8px">Произвольное содержимое: текст, поля, кнопки</p>
			<mat-form-field>
				<input matInput placeholder="Имя" />
			</mat-form-field>
		</mat-dialog-content>
		<mat-dialog-actions>
			<button matButton mat-dialog-close>Отмена</button>
			<button matButton mat-dialog-close>Сохранить</button>
		</mat-dialog-actions>
	`,
})
class DialogContent {}

/** A button opens a dialog with a field inside, as the soldy preview. */
@Component({
	selector: 'bench-dialog',
	imports: [MatButton],
	changeDetection: ChangeDetectionStrategy.OnPush,
	template: `<button matButton (click)="open()">Открыть окно</button>`,
})
export default class DialogPage {
	private readonly dialog = inject(MatDialog)

	open(): void {
		this.dialog.open(DialogContent)
	}
}
