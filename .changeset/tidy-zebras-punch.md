---
'@soldy-ui/react': patch
---

Server Components: a Server Component writes the parts through the owner too (`Tabs.Item`, `Select.Item`, `Table.Row`), not only by their flat names — the module that hangs the parts on the owner is a server module now, and the owner and each part come as references of their own.
