import { redirect } from 'next/navigation';

/**
 * Compatibility route for older or manually typed singular opportunity links.
 * The canonical HMSI directory is /opportunities.
 */
export default function OpportunityAliasPage() {
  redirect('/opportunities');
}
