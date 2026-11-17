<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Application boundaries
- Checkout is demo-only and browser-local; carts with real-store products show an 'unavailable' notice and never call order placement, so no real fulfillment or stock change can occur until the owner enables it.
- Keep demo dashboards isolated in namespaced browser storage; real seller management uses authenticated server functions and owner-scoped access.
- Keep private account and seller routes under the client-only authenticated layout; public catalog and demo routes remain crawlable.
- Keep real admin management under the authenticated layout with a server-side role check on every operation; preserve `/admin` as the protected URL and `/demo/admin` as the isolated demo.
- Apply compare-and-update lifecycle checks to order item changes so stale actions cannot skip or reverse fulfillment states.
- Validate seller image links as public credential-free HTTPS URLs; never fetch submitted links server-side, and use neutral local placeholders on failures.