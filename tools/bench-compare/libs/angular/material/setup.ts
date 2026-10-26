// The theme comes only under the `style` condition, and an import from a
// script does not take it — by file, as at the table stand
import '../../../node_modules/@angular/material/prebuilt-themes/azure-blue.css'
import { provideNativeDateAdapter } from '@angular/material/core'

/**
 * Angular Material as the application sets it up: a prebuilt theme and the
 * application providers. Animations are CSS in Material 22 — no animations
 * provider. The date adapter is the native one, from the docs of the
 * datepicker: the date picker needs an adapter in the application.
 */
export const providers = [provideNativeDateAdapter()]
