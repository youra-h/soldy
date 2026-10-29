---
'@soldy-ui/theme-base': patch
'@soldy-ui/theme-oren': patch
---

Table: rows no longer show through the sticky head while a column is carried — one backing under the whole head replaces the squares under each header. Its height is the head height `TTableHeadPlugin` writes (`--so-table-head-height`): a theme that does not install the plugin gets a backing one head row high.
