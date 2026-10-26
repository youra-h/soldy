import '@carbon/web-components/es/components/toggle/index.js'
import { h } from '../dom'

/** `cds-toggle` with its label and without the on/off texts — the soldy Switch under a Label. */
export default () => h('cds-toggle', { 'label-text': 'Включено', 'hide-label': false })
