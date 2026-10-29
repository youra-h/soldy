import { useIcons, useTheme } from '@soldy-ui/setup'
import * as material from '@soldy-ui/icons-material'
import oren from '@soldy-ui/theme-oren/setup'
import { TButtonElement, TDialogElement } from '@soldy-ui/webc'

import '@soldy-ui/theme-oren'

useIcons(material)
useTheme(oren)

// As the README of the adapter writes it: `instanceof` gives the element's props
const dialog = document.getElementById('settings')

document.getElementById('open')?.addEventListener('click', () => {
	if (dialog instanceof TDialogElement) {
		dialog.visible = true
	}
})

const typed = document.createElement('button', { is: 'so-button' })

if (TButtonElement.is(typed)) {
	// @ts-expect-error `text` is a string: the adapter's types reach the project
	typed.text = 1
}
