# Production retention and role-room verification — 25 August 2026

**Deployment checked:** `https://hmsi-ngo-6411vn9b8-hmsi-ngo-web.vercel.app` (commit `18557be`).

## Verified non-destructive result

An unauthenticated visit to `https://hmsi-ngo-6411vn9b8-hmsi-ngo-web.vercel.app/worker-room` redirected to the standard HMSI portal sign-in page. The page therefore did not expose Worker Operations room content without a matching active worker portal session.

An unauthenticated visit to `https://hmsi-ngo-6411vn9b8-hmsi-ngo-web.vercel.app/admin/applications` redirected to the private HMSI Admin sign-in page at `/hmsi-control`. The pending inbox and application archives therefore did not expose administrative content before an administrator session was established.

After administrator sign-in, the protected application inbox loaded and displayed the explicit **Pending inbox** and **View archives** controls. It showed no pending volunteer/worker, member, or opportunity applications at the time of the check. No application status, archive, or removal control was invoked.

The authenticated **View archives** control switched to the protected archive state and showed the expected empty-state message, **“No archived applications are recorded.”** No archive entry was created or edited.

An unauthenticated `GET` request to `/api/portal/rooms/worker` returned `{"error":"Portal sign-in is required."}`. No room message was read or posted without a matching active portal session.

No authentication attempt, message submission, removal request, application update, archive action, or scheduled cleanup request was made during this check.
