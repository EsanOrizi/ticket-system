/**
 * Seeds 100 realistic demo tickets into the database.
 *
 * Tickets span 5 categories, 4 statuses, and ~90 days of history so that
 * sorting by any column produces meaningfully different orderings.
 *
 * Run against the dev database:
 *   bun run prisma/seed-tickets-demo.ts
 *
 * Idempotent: skips any ticket whose subject already exists.
 */

import { prisma } from "../src/lib/prisma";

// ---------------------------------------------------------------------------
// Raw ticket data
// ---------------------------------------------------------------------------

type Status = "OPEN" | "IN_PROGRESS" | "CLOSED" | "RESOLVED";
type Category =
  | "BILLING"
  | "TECHNICAL"
  | "BUG_REPORT"
  | "FEATURE_REQUEST"
  | "GENERAL_QUESTION"
  | "ACCOUNT";

interface TicketSeed {
  subject: string;
  body: string;
  status: Status;
  category: Category;
  fromName: string | null;
  fromEmail: string | null;
  source: "WEB" | "EMAIL";
}

const TICKETS: TicketSeed[] = [
  // ── BILLING (15) ────────────────────────────────────────────────────────
  {
    subject: "Invoice for March is incorrect",
    body: "Hi, I just received my invoice for March and the amount charged is $249 instead of the $199 we agreed on. Can you please review and issue a corrected invoice?",
    status: "OPEN", category: "BILLING",
    fromName: "Bob Wilson", fromEmail: "bob.wilson@techcorp.com", source: "EMAIL",
  },
  {
    subject: "Failed payment — card declined",
    body: "My payment failed this morning with a card-declined error. I've verified with my bank and the card is fine. Please retry or let me know how to update billing.",
    status: "IN_PROGRESS", category: "BILLING",
    fromName: "Sarah Chen", fromEmail: "sarah.chen@startup.io", source: "EMAIL",
  },
  {
    subject: "Refund request for unused subscription months",
    body: "I cancelled my account on March 3rd but was billed for the full quarter. I'd like a pro-rata refund for the unused two months please.",
    status: "CLOSED", category: "BILLING",
    fromName: "Marcus Thompson", fromEmail: "marcus@consultingfirm.com", source: "EMAIL",
  },
  {
    subject: "Upgrade plan from Starter to Pro",
    body: "We're growing fast and need the Pro plan features — specifically SSO and audit logs. Please help me upgrade and confirm the new pricing.",
    status: "OPEN", category: "BILLING",
    fromName: "Priya Sharma", fromEmail: "priya.sharma@financegroup.com", source: "WEB",
  },
  {
    subject: "VAT invoice needed for tax filing",
    body: "Our accountants need a VAT-compliant invoice for the last 12 months of payments. Could you please send these to finance@eurotech.de?",
    status: "OPEN", category: "BILLING",
    fromName: "Lars Müller", fromEmail: "lars.mueller@eurotech.de", source: "EMAIL",
  },
  {
    subject: "Annual subscription renewal failed",
    body: "The auto-renewal on our annual plan failed last night. We don't want to lose access. Can someone help us complete the renewal manually?",
    status: "IN_PROGRESS", category: "BILLING",
    fromName: "Emma Rodriguez", fromEmail: "emma.r@mediaco.org", source: "EMAIL",
  },
  {
    subject: "Double charged this month",
    body: "I was charged twice on the 1st of this month — $99 at 2am and again at 9am. Please refund the duplicate charge.",
    status: "OPEN", category: "BILLING",
    fromName: "David Kim", fromEmail: "david.kim@retailchain.com", source: "EMAIL",
  },
  {
    subject: "Cancel subscription at end of billing period",
    body: "Please cancel our subscription when the current period ends on April 30th. We don't want to be auto-renewed. Confirmation email would be appreciated.",
    status: "CLOSED", category: "BILLING",
    fromName: "Fatima Al-Hassan", fromEmail: "fatima@consultancy.ae", source: "WEB",
  },
  {
    subject: "Need payment receipt for expense claim",
    body: "I need a PDF receipt for the payment made on 15 February for $149. My company expense system requires it.",
    status: "CLOSED", category: "BILLING",
    fromName: "James O'Brien", fromEmail: "james.obrien@lawfirm.ie", source: "EMAIL",
  },
  {
    subject: "Discount code LAUNCH20 not applied at checkout",
    body: "I entered the code LAUNCH20 at checkout but the discount wasn't applied and I was charged full price. Can you either apply the discount or credit my account?",
    status: "OPEN", category: "BILLING",
    fromName: "Nina Patel", fromEmail: "nina.patel@ecommerce.in", source: "WEB",
  },
  {
    subject: "Invoice missing company address and tax ID",
    body: "The invoice we received doesn't include our company address or VAT registration number, which we need for bookkeeping. Please reissue.",
    status: "IN_PROGRESS", category: "BILLING",
    fromName: "Wei Zhang", fromEmail: "wei.zhang@manufacturing.cn", source: "EMAIL",
  },
  {
    subject: "Switch billing from annual to monthly",
    body: "Cash flow has been tight this quarter. Is it possible to switch from annual billing to monthly? Happy to pay the higher per-month rate.",
    status: "OPEN", category: "BILLING",
    fromName: "Chloe Martin", fromEmail: "chloe.martin@designstudio.fr", source: "WEB",
  },
  {
    subject: "Payment method update keeps failing",
    body: "I'm trying to update my credit card but the form shows a generic error every time I submit. I've tried three different cards.",
    status: "CLOSED", category: "BILLING",
    fromName: "Alex Novak", fromEmail: "alex.novak@software.cz", source: "WEB",
  },
  {
    subject: "Pro-rata charge explanation needed",
    body: "I upgraded mid-month and see a pro-rata line item of $34.17. I'd like a breakdown of how this was calculated.",
    status: "OPEN", category: "BILLING",
    fromName: "Isabella Costa", fromEmail: "i.costa@logistics.br", source: "EMAIL",
  },
  {
    subject: "Trial ended but I was charged immediately",
    body: "My 14-day trial ended yesterday and I was charged $99 this morning, but I never explicitly confirmed a subscription. Please cancel and refund.",
    status: "IN_PROGRESS", category: "BILLING",
    fromName: "Ryan O'Sullivan", fromEmail: "ryan@irishstartup.ie", source: "EMAIL",
  },

  // ── TECHNICAL (25) ──────────────────────────────────────────────────────
  {
    subject: "App crashes on login when using SSO",
    body: "Since the update on Friday, clicking 'Login with SSO' crashes the web app with a white screen. Our entire team is locked out. This is urgent.",
    status: "OPEN", category: "TECHNICAL",
    fromName: "Thomas Berg", fromEmail: "t.berg@automotive.se", source: "EMAIL",
  },
  {
    subject: "API returning 429 rate limit errors in production",
    body: "We're hitting rate limits on the /v2/tickets endpoint at around 800 req/min, but our plan says 1000 req/min. Something is wrong.",
    status: "IN_PROGRESS", category: "TECHNICAL",
    fromName: "Amelia Johnson", fromEmail: "amelia.j@apicompany.com", source: "EMAIL",
  },
  {
    subject: "CSV export includes unexpected empty columns",
    body: "When I export tickets to CSV, columns H through K are blank with no headers. This is breaking our data pipeline imports.",
    status: "OPEN", category: "TECHNICAL",
    fromName: "Carlos Reyes", fromEmail: "c.reyes@datateam.mx", source: "WEB",
  },
  {
    subject: "Email notifications stopped sending 3 days ago",
    body: "Our customers stopped receiving email notifications on Wednesday. We've checked spam folders. Server logs show the emails are queued but not delivered.",
    status: "IN_PROGRESS", category: "TECHNICAL",
    fromName: "Yuki Tanaka", fromEmail: "yuki.tanaka@mediagroup.jp", source: "EMAIL",
  },
  {
    subject: "Webhook endpoint returns 504 timeout on large payloads",
    body: "Webhooks with more than ~50 line items in the payload timeout after 30 seconds with a 504. Small payloads work fine.",
    status: "OPEN", category: "TECHNICAL",
    fromName: "Olivia Smith", fromEmail: "o.smith@devops.io", source: "WEB",
  },
  {
    subject: "Mobile app crashes on iOS 17.4 on launch",
    body: "After updating to iOS 17.4 the app crashes immediately on launch. Rolling back iOS isn't an option. Crash report attached.",
    status: "OPEN", category: "TECHNICAL",
    fromName: "Noah Williams", fromEmail: "noah.w@appdeveloper.com", source: "EMAIL",
  },
  {
    subject: "Dashboard takes 15+ seconds to load",
    body: "The main dashboard has become progressively slower over the past two weeks. It now takes 15–20 seconds to show data. Network tab shows a slow /summary API call.",
    status: "IN_PROGRESS", category: "TECHNICAL",
    fromName: "Ava Brown", fromEmail: "ava.brown@analytics.co", source: "WEB",
  },
  {
    subject: "Two-factor authentication stuck in a loop",
    body: "After entering the correct 2FA code I'm redirected back to the 2FA prompt instead of the dashboard. I've tried multiple devices and browsers.",
    status: "OPEN", category: "TECHNICAL",
    fromName: "Ethan Davis", fromEmail: "ethan.d@securityfirm.com", source: "EMAIL",
  },
  {
    subject: "Data not syncing between desktop and mobile",
    body: "Changes made on desktop don't appear on mobile until I force-quit and reopen the app. Real-time sync seems to be broken.",
    status: "CLOSED", category: "TECHNICAL",
    fromName: "Mia Wilson", fromEmail: "mia.wilson@cloudcompany.net", source: "WEB",
  },
  {
    subject: "File upload fails for files larger than 5 MB",
    body: "Uploading any file over 5 MB returns a 413 error. Our plan advertises 25 MB uploads. Files under 5 MB upload fine.",
    status: "OPEN", category: "TECHNICAL",
    fromName: "Lucas Garcia", fromEmail: "lucas.g@creativestudio.es", source: "EMAIL",
  },
  {
    subject: "Search returns no results for common terms",
    body: "Searching for 'invoice', 'billing', or 'user' returns zero results even though I can see those records in the list. The search index may be broken.",
    status: "IN_PROGRESS", category: "TECHNICAL",
    fromName: "Harper Martinez", fromEmail: "h.martinez@searchtech.com", source: "WEB",
  },
  {
    subject: "Browser extension not compatible with Edge 121",
    body: "After Microsoft Edge updated to version 121 our extension shows 'incompatible version' and won't install. Chrome is fine.",
    status: "OPEN", category: "TECHNICAL",
    fromName: "Liam Anderson", fromEmail: "liam.a@enterprise.co.uk", source: "EMAIL",
  },
  {
    subject: "Password reset email never arrives",
    body: "I've clicked 'Forgot password' five times over two days. No email arrives, not even in spam. My email address is correct.",
    status: "CLOSED", category: "TECHNICAL",
    fromName: "Charlotte Taylor", fromEmail: "c.taylor@university.edu", source: "WEB",
  },
  {
    subject: "Dark mode preference not saving between sessions",
    body: "Every time I log out and back in, the interface reverts to light mode. I have to toggle dark mode every session.",
    status: "OPEN", category: "TECHNICAL",
    fromName: "Benjamin Jackson", fromEmail: "ben.j@productdesign.com", source: "WEB",
  },
  {
    subject: "PDF report exports as completely blank",
    body: "The 'Export to PDF' button generates a file but every page is blank. The same report displays correctly on screen.",
    status: "OPEN", category: "TECHNICAL",
    fromName: "Sofia White", fromEmail: "sofia.w@reportingco.com", source: "EMAIL",
  },
  {
    subject: "Audit log missing 3 days of entries",
    body: "Our compliance team noticed that audit log entries from March 14–16 are missing entirely. This is critical for our upcoming audit.",
    status: "IN_PROGRESS", category: "TECHNICAL",
    fromName: "Jack Harris", fromEmail: "j.harris@compliance.co.uk", source: "EMAIL",
  },
  {
    subject: "Zapier integration stopped triggering",
    body: "Our Zap has been running without issues for 6 months but stopped firing on March 20th. The Zapier logs show no new triggers since then.",
    status: "OPEN", category: "TECHNICAL",
    fromName: "Ella Thompson", fromEmail: "ella.t@automation.io", source: "WEB",
  },
  {
    subject: "Notification emails sent to previous email address",
    body: "I changed my account email 2 weeks ago but system notifications are still going to the old address. My new address is correct in profile settings.",
    status: "CLOSED", category: "TECHNICAL",
    fromName: "Aiden Clark", fromEmail: "aiden.c@agency.com", source: "EMAIL",
  },
  {
    subject: "API key rotation causes 401 for 10 minutes",
    body: "After rotating an API key via the dashboard there's a ~10-minute window where the new key returns 401. Old key already deactivated. This breaks our CI pipeline.",
    status: "IN_PROGRESS", category: "TECHNICAL",
    fromName: "Samuel Robinson", fromEmail: "s.robinson@developer.net", source: "WEB",
  },
  {
    subject: "Google Calendar sync not reflecting updates",
    body: "Events created in the app appear in Google Calendar, but edits and deletions don't sync. The OAuth connection shows as active.",
    status: "OPEN", category: "TECHNICAL",
    fromName: "Zoë Walker", fromEmail: "zoe.w@productivity.app", source: "EMAIL",
  },
  {
    subject: "Custom domain SSL certificate showing as expired",
    body: "Users are getting SSL warnings when visiting our custom domain. The certificate expired 2 days ago and auto-renewal doesn't seem to have triggered.",
    status: "OPEN", category: "TECHNICAL",
    fromName: "Logan Hall", fromEmail: "logan.h@webhosting.com", source: "EMAIL",
  },
  {
    subject: "Bulk CSV import fails at row 247",
    body: "Our 500-row CSV import consistently fails at row 247 with 'invalid date format'. I've checked row 247 and the format looks correct.",
    status: "IN_PROGRESS", category: "TECHNICAL",
    fromName: "Penelope Young", fromEmail: "p.young@datamgmt.com", source: "WEB",
  },
  {
    subject: "Print layout cuts off the rightmost column",
    body: "When printing any table view, the last column is cut off on A4 paper. The printed output is missing the 'Assigned to' column entirely.",
    status: "OPEN", category: "TECHNICAL",
    fromName: "Jackson Allen", fromEmail: "j.allen@publishing.co", source: "EMAIL",
  },
  {
    subject: "OAuth redirect URI mismatch on production",
    body: "After deploying to our production domain we get 'redirect_uri_mismatch'. I've added the production URI to the OAuth app settings but still seeing the error.",
    status: "CLOSED", category: "TECHNICAL",
    fromName: "Aria King", fromEmail: "aria.k@authtech.com", source: "WEB",
  },
  {
    subject: "Slack notifications duplicated for every event",
    body: "Since connecting our Slack workspace every event sends 2–3 duplicate notifications. Checked our Slack app settings and only one webhook is configured.",
    status: "OPEN", category: "TECHNICAL",
    fromName: "Oliver Barnes", fromEmail: "o.barnes@slackuser.com", source: "EMAIL",
  },

  // ── BUG_REPORT (20) ─────────────────────────────────────────────────────
  {
    subject: "Duplicate records created when saving rapidly",
    body: "If a user double-clicks the Save button quickly, a duplicate record is created. We've reproduced this consistently. The Submit button should be disabled after first click.",
    status: "OPEN", category: "BUG_REPORT",
    fromName: "Mason Wright", fromEmail: "m.wright@saas.com", source: "WEB",
  },
  {
    subject: "Date filter ignores user timezone offset",
    body: "Filtering by 'today' shows records from yesterday evening (UTC) which is today in my timezone (UTC+8). The filter should use the user's local timezone.",
    status: "IN_PROGRESS", category: "BUG_REPORT",
    fromName: "Evelyn Scott", fromEmail: "e.scott@globalteam.com", source: "EMAIL",
  },
  {
    subject: "Soft-deleted items reappear after browser refresh",
    body: "Deleting a record removes it from the list, but after pressing F5 it comes back. The deletion appears to be client-side only.",
    status: "OPEN", category: "BUG_REPORT",
    fromName: "Logan Green", fromEmail: "l.green@webcorp.com", source: "WEB",
  },
  {
    subject: "Summary dashboard shows incorrect total count",
    body: "The 'Total Tickets' card shows 1,847 but when I export all tickets the CSV has 1,902 rows. The count is off by 55.",
    status: "OPEN", category: "BUG_REPORT",
    fromName: "Abigail Baker", fromEmail: "abby.baker@finance.com", source: "EMAIL",
  },
  {
    subject: "Tooltip overlaps input field on small screens",
    body: "On screens narrower than 768px the hover tooltip for the date picker field covers the input itself, making it impossible to type.",
    status: "IN_PROGRESS", category: "BUG_REPORT",
    fromName: "Elijah Adams", fromEmail: "e.adams@mobiledev.com", source: "WEB",
  },
  {
    subject: "Rich text editor loses formatting when pasting from Word",
    body: "Pasting content from Microsoft Word strips all bold, italic, and heading formatting. Other editors like Notion preserve it fine.",
    status: "OPEN", category: "BUG_REPORT",
    fromName: "Elizabeth Nelson", fromEmail: "liz.n@contentteam.com", source: "EMAIL",
  },
  {
    subject: "Resizing a table column breaks the entire layout",
    body: "Dragging any column resizer causes the table to render incorrectly — columns overlap and the header misaligns with the body. Refreshing fixes it temporarily.",
    status: "CLOSED", category: "BUG_REPORT",
    fromName: "Matthew Carter", fromEmail: "m.carter@spreadsheetco.com", source: "WEB",
  },
  {
    subject: "Autocomplete dropdown shows results for wrong field",
    body: "When typing in the 'Assignee' field, the dropdown shows customer names instead of agent names. The wrong dataset is being queried.",
    status: "OPEN", category: "BUG_REPORT",
    fromName: "Addison Mitchell", fromEmail: "a.mitchell@searchapp.com", source: "EMAIL",
  },
  {
    subject: "Alphabetical sort ignores accented characters",
    body: "Sorting by name puts Ángel and Ñoño after all Z entries instead of with A and N. Unicode collation isn't being used.",
    status: "IN_PROGRESS", category: "BUG_REPORT",
    fromName: "Scarlett Perez", fromEmail: "s.perez@international.co", source: "WEB",
  },
  {
    subject: "Dropdown menu closes when scrolling on iOS",
    body: "On iPhone, touching a dropdown to open it and then scrolling dismisses it immediately. This makes the dropdown unusable on mobile.",
    status: "OPEN", category: "BUG_REPORT",
    fromName: "Henry Roberts", fromEmail: "h.roberts@touchui.com", source: "EMAIL",
  },
  {
    subject: "Empty state flashes briefly before data loads",
    body: "There's a visible flash of 'No results found' for ~300ms before the data renders. The empty state should only show after loading is confirmed complete.",
    status: "RESOLVED", category: "BUG_REPORT",
    fromName: "Lily Turner", fromEmail: "l.turner@ux.io", source: "WEB",
  },
  {
    subject: "All timestamps displayed in UTC instead of local time",
    body: "Every timestamp in the UI shows UTC time regardless of timezone settings. Users in other timezones are confused about when events occurred.",
    status: "OPEN", category: "BUG_REPORT",
    fromName: "Sebastian Phillips", fromEmail: "s.phillips@globalbiz.com", source: "EMAIL",
  },
  {
    subject: "Copy to clipboard fails silently in Firefox",
    body: "The 'Copy link' button does nothing in Firefox 122. No error is shown to the user. Works in Chrome and Safari. Likely a Clipboard API permission issue.",
    status: "IN_PROGRESS", category: "BUG_REPORT",
    fromName: "Victoria Campbell", fromEmail: "v.campbell@webcompat.org", source: "WEB",
  },
  {
    subject: "Long email addresses break table row layout",
    body: "Email addresses over ~45 characters push the table columns out of alignment. The cell should truncate with an ellipsis.",
    status: "OPEN", category: "BUG_REPORT",
    fromName: "Daniel Parker", fromEmail: "d.parker@tableco.com", source: "EMAIL",
  },
  {
    subject: "Chart Y-axis label is cut off at the top",
    body: "In bar charts, the top value on the Y-axis is clipped by the chart container. This happens when the max value has 4+ digits.",
    status: "OPEN", category: "BUG_REPORT",
    fromName: "Natalie Evans", fromEmail: "n.evans@chartlib.com", source: "WEB",
  },
  {
    subject: "Ctrl+Z undo fires twice, reverting two steps",
    body: "Pressing Ctrl+Z in the text editor reverts two changes instead of one. It seems the keydown event is being registered twice.",
    status: "IN_PROGRESS", category: "BUG_REPORT",
    fromName: "David Edwards", fromEmail: "d.edwards@shortcutapp.com", source: "WEB",
  },
  {
    subject: "User avatar shows wrong initials after name change",
    body: "After updating a user's name, their avatar still shows the old initials until you hard-refresh the page.",
    status: "OPEN", category: "BUG_REPORT",
    fromName: "Layla Collins", fromEmail: "l.collins@profileapp.com", source: "EMAIL",
  },
  {
    subject: "Markdown preview doesn't update in real time",
    body: "The live preview pane only updates when I click outside the editor. It should update as I type with a short debounce.",
    status: "RESOLVED", category: "BUG_REPORT",
    fromName: "John Stewart", fromEmail: "j.stewart@markdownco.com", source: "WEB",
  },
  {
    subject: "Chart colors inconsistent between light and dark mode",
    body: "In dark mode the third data series uses a near-black colour that's invisible against the dark background. The colour palette needs updating for dark mode.",
    status: "OPEN", category: "BUG_REPORT",
    fromName: "Aubrey Morris", fromEmail: "a.morris@visualizationtool.com", source: "EMAIL",
  },
  {
    subject: "Pagination Next button disabled when more pages exist",
    body: "On pages with exactly 25 items (the page size) the Next button is disabled even though there's a next page. Off-by-one error in the page count.",
    status: "OPEN", category: "BUG_REPORT",
    fromName: "Joseph Rogers", fromEmail: "j.rogers@paginationlib.com", source: "WEB",
  },

  // ── FEATURE_REQUEST (20) ────────────────────────────────────────────────
  {
    subject: "Bulk delete for multiple tickets at once",
    body: "We handle hundreds of tickets per day and need a way to select and delete (or close) multiple tickets at once. Individual deletion is too slow.",
    status: "OPEN", category: "FEATURE_REQUEST",
    fromName: "Samantha Reed", fromEmail: "s.reed@poweruser.com", source: "WEB",
  },
  {
    subject: "Markdown support in ticket descriptions",
    body: "Our technical team would benefit greatly from markdown in ticket bodies — code blocks especially. Plain text is limiting.",
    status: "CLOSED", category: "FEATURE_REQUEST",
    fromName: "Christopher Cook", fromEmail: "c.cook@developer.io", source: "EMAIL",
  },
  {
    subject: "Allow custom ticket statuses beyond Open and Closed",
    body: "We use a multi-step workflow: New → Triaged → In Review → Pending Customer → Resolved. The fixed statuses don't match our process.",
    status: "OPEN", category: "FEATURE_REQUEST",
    fromName: "Bella Morgan", fromEmail: "b.morgan@workflow.co", source: "WEB",
  },
  {
    subject: "Keyboard shortcuts for common actions",
    body: "Power users would love keyboard shortcuts: N for new ticket, / for search, E to edit, Esc to close modals. Similar to Gmail's keyboard navigation.",
    status: "IN_PROGRESS", category: "FEATURE_REQUEST",
    fromName: "Tyler Bell", fromEmail: "t.bell@productivity.app", source: "EMAIL",
  },
  {
    subject: "Export tickets to Excel (.xlsx) format",
    body: "Our management team wants to analyse ticket data in Excel. The current CSV export doesn't preserve formatting or data types well.",
    status: "OPEN", category: "FEATURE_REQUEST",
    fromName: "Anna Murphy", fromEmail: "a.murphy@dataanalyst.com", source: "WEB",
  },
  {
    subject: "Slack integration for new ticket notifications",
    body: "We'd love to receive a Slack message in our #support channel whenever a new ticket is created, with the subject and sender details.",
    status: "OPEN", category: "FEATURE_REQUEST",
    fromName: "Nathan Bailey", fromEmail: "n.bailey@teamchat.com", source: "WEB",
  },
  {
    subject: "Dark mode for the entire dashboard",
    body: "We use dark mode across all our tools and the bright white dashboard is jarring in contrast. A system-preference-aware dark mode would be ideal.",
    status: "CLOSED", category: "FEATURE_REQUEST",
    fromName: "Alexis Rivera", fromEmail: "a.rivera@nightowl.dev", source: "EMAIL",
  },
  {
    subject: "Assign a ticket to multiple agents simultaneously",
    body: "Complex tickets sometimes require two agents to collaborate. Currently only one assignee is allowed, which creates coordination problems.",
    status: "IN_PROGRESS", category: "FEATURE_REQUEST",
    fromName: "Hannah Cooper", fromEmail: "h.cooper@supportteam.com", source: "WEB",
  },
  {
    subject: "Show agent online/offline status in the UI",
    body: "Customers ask if an agent is available. An online indicator (green dot) next to the assigned agent would set better expectations.",
    status: "OPEN", category: "FEATURE_REQUEST",
    fromName: "Dylan Richardson", fromEmail: "d.richardson@liveops.com", source: "EMAIL",
  },
  {
    subject: "SLA timer visible on each open ticket",
    body: "We have a 24-hour SLA and manually tracking deadlines is error-prone. A countdown timer showing time remaining would help agents prioritise.",
    status: "OPEN", category: "FEATURE_REQUEST",
    fromName: "Aubrey Cox", fromEmail: "a.cox@sla.co", source: "WEB",
  },
  {
    subject: "Customisable email reply templates",
    body: "We reply to many similar enquiries. Saved reply templates with variable substitution ({{customer_name}}, {{ticket_id}}) would save us hours per week.",
    status: "OPEN", category: "FEATURE_REQUEST",
    fromName: "Wyatt Howard", fromEmail: "w.howard@emailpro.com", source: "EMAIL",
  },
  {
    subject: "Ticket merge to combine duplicate submissions",
    body: "Customers sometimes submit the same issue multiple times. A merge function that combines two tickets (keeping the history of both) would help.",
    status: "IN_PROGRESS", category: "FEATURE_REQUEST",
    fromName: "Zoe Ward", fromEmail: "z.ward@duplicates.io", source: "WEB",
  },
  {
    subject: "Scheduled / recurring tickets",
    body: "Some of our support checks are recurring (e.g. weekly system health review). A scheduled ticket that creates automatically on a cron would be useful.",
    status: "OPEN", category: "FEATURE_REQUEST",
    fromName: "Caleb Torres", fromEmail: "c.torres@automation.co", source: "EMAIL",
  },
  {
    subject: "Increase file attachment limit to 50 MB",
    body: "Our customers often need to attach log files and screen recordings which regularly exceed the current 10 MB limit. 50 MB would cover 95% of our use cases.",
    status: "OPEN", category: "FEATURE_REQUEST",
    fromName: "Madeline Peterson", fromEmail: "m.peterson@bigfiles.com", source: "WEB",
  },
  {
    subject: "Advanced search with AND/OR/NOT operators",
    body: "The basic search is too limited for our large ticket volume. Boolean search (e.g. 'billing AND NOT refund') would let us find exactly what we need.",
    status: "CLOSED", category: "FEATURE_REQUEST",
    fromName: "Aaron Gray", fromEmail: "a.gray@searchpro.io", source: "EMAIL",
  },
  {
    subject: "Read receipts when customers view a reply",
    body: "We'd like to know when a customer has read our response so we can follow up if they haven't engaged after 48 hours.",
    status: "OPEN", category: "FEATURE_REQUEST",
    fromName: "Jasmine Ramirez", fromEmail: "j.ramirez@crm.com", source: "WEB",
  },
  {
    subject: "Timeline / Gantt view for tracking ticket progress",
    body: "For large projects we manage through tickets, a Gantt-style timeline view would help with planning and stakeholder reporting.",
    status: "OPEN", category: "FEATURE_REQUEST",
    fromName: "Hunter James", fromEmail: "h.james@projectmgmt.co", source: "EMAIL",
  },
  {
    subject: "Auto-assign new tickets based on category rules",
    body: "We want 'BILLING' tickets to auto-assign to our finance team and 'TECHNICAL' tickets to go to engineering. A rules engine for routing would reduce manual triaging.",
    status: "IN_PROGRESS", category: "FEATURE_REQUEST",
    fromName: "Skylar Watson", fromEmail: "s.watson@routing.io", source: "WEB",
  },
  {
    subject: "Time tracking logged against each ticket",
    body: "We bill clients based on time spent per ticket. Built-in time tracking (start/stop timer) would replace our separate time-tracking tool.",
    status: "OPEN", category: "FEATURE_REQUEST",
    fromName: "Savannah Brooks", fromEmail: "s.brooks@billable.io", source: "EMAIL",
  },
  {
    subject: "Customisable dashboard widgets and layout",
    body: "Different team members need different metrics. Drag-and-drop widgets (open tickets, avg response time, CSAT score) would make the dashboard much more useful.",
    status: "OPEN", category: "FEATURE_REQUEST",
    fromName: "Blake Kelly", fromEmail: "b.kelly@analytics.co", source: "WEB",
  },

  // ── GENERAL_QUESTION (10) ───────────────────────────────────────────────
  {
    subject: "How do I invite team members to the workspace?",
    body: "I'm the account admin but can't find where to invite colleagues. The documentation mentions an 'Invite' button under Settings but I don't see it.",
    status: "CLOSED", category: "GENERAL_QUESTION",
    fromName: "Jordan Price", fromEmail: "j.price@newuser.com", source: "WEB",
  },
  {
    subject: "What is the maximum file attachment size?",
    body: "Before I submit a large log file I want to confirm the size limit for attachments. The FAQ mentions 10 MB but I've seen 25 MB mentioned elsewhere.",
    status: "CLOSED", category: "GENERAL_QUESTION",
    fromName: "Taylor Sanders", fromEmail: "t.sanders@curious.co", source: "EMAIL",
  },
  {
    subject: "Can I export all my data before cancelling?",
    body: "We're evaluating whether to continue our subscription. Can I export all tickets, contacts, and settings as a backup before I make a decision?",
    status: "OPEN", category: "GENERAL_QUESTION",
    fromName: "Morgan Bennett", fromEmail: "m.bennett@concerned.io", source: "WEB",
  },
  {
    subject: "How does auto-close work for inactive tickets?",
    body: "I see that tickets auto-close after some period of inactivity. What is that period and can it be configured? We sometimes have tickets that are legitimately quiet for weeks.",
    status: "OPEN", category: "GENERAL_QUESTION",
    fromName: "Casey Wood", fromEmail: "c.wood@learning.com", source: "EMAIL",
  },
  {
    subject: "Is there a native mobile app for iOS and Android?",
    body: "I saw a mobile app mentioned in a blog post from 2022. Is there a current native app or just a mobile web experience?",
    status: "CLOSED", category: "GENERAL_QUESTION",
    fromName: "Riley Barnes", fromEmail: "r.barnes@mobileuser.com", source: "WEB",
  },
  {
    subject: "How do I configure email routing to create tickets automatically?",
    body: "I want emails sent to support@ourcompany.com to automatically create tickets in the system. What's the setup process?",
    status: "OPEN", category: "GENERAL_QUESTION",
    fromName: "Peyton Ross", fromEmail: "p.ross@emailadmin.com", source: "EMAIL",
  },
  {
    subject: "What is the difference between AGENT and ADMIN roles?",
    body: "I'm setting up my team and want to understand what each role can and can't do before assigning permissions. Is there a permission matrix document?",
    status: "CLOSED", category: "GENERAL_QUESTION",
    fromName: "Reese Henderson", fromEmail: "r.henderson@rbac.co", source: "WEB",
  },
  {
    subject: "Can we white-label the customer portal?",
    body: "Our clients access a support portal and we'd like it to use our own branding and domain. Is white-labelling available on our current plan?",
    status: "OPEN", category: "GENERAL_QUESTION",
    fromName: "Quinn Coleman", fromEmail: "q.coleman@agency.com", source: "EMAIL",
  },
  {
    subject: "How long are audit logs retained?",
    body: "Our compliance framework requires 12 months of audit log history. How long does the system retain audit logs and is it configurable?",
    status: "OPEN", category: "GENERAL_QUESTION",
    fromName: "Finley Jenkins", fromEmail: "f.jenkins@compliance.org", source: "WEB",
  },
  {
    subject: "Does the REST API support cursor-based pagination?",
    body: "We're building an integration that needs to sync a large dataset. Does your API support cursor-based pagination or only offset/limit?",
    status: "CLOSED", category: "GENERAL_QUESTION",
    fromName: "Rory Powell", fromEmail: "r.powell@developer.net", source: "EMAIL",
  },

  // ── ACCOUNT (10) ────────────────────────────────────────────────────────
  {
    subject: "Transfer account ownership to new hire",
    body: "Our previous account owner has left the company. I need to transfer ownership to our new IT manager. Current owner's account is still active.",
    status: "OPEN", category: "ACCOUNT",
    fromName: "Avery Patterson", fromEmail: "a.patterson@hrteam.com", source: "WEB",
  },
  {
    subject: "Merge two separate accounts for same organisation",
    body: "Two teams in our company signed up separately. We need to merge the two accounts (and their data) into one under our enterprise contract.",
    status: "IN_PROGRESS", category: "ACCOUNT",
    fromName: "Drew Long", fromEmail: "d.long@acquisition.co", source: "EMAIL",
  },
  {
    subject: "GDPR data deletion request for departed user",
    body: "A former employee has submitted a GDPR right-to-erasure request. Please delete all personal data associated with alex.former@ourcompany.eu.",
    status: "OPEN", category: "ACCOUNT",
    fromName: "Emery Hughes", fromEmail: "e.hughes@privacy.eu", source: "EMAIL",
  },
  {
    subject: "Transfer subscription to new company email domain",
    body: "We rebranded and changed our email domain from oldcorp.com to newcorp.com. All user emails and billing details need to be updated.",
    status: "IN_PROGRESS", category: "ACCOUNT",
    fromName: "Emerson Flores", fromEmail: "em.flores@reorg.com", source: "WEB",
  },
  {
    subject: "Locked out — lost access to MFA device",
    body: "I've lost my phone that had the authenticator app. I can't log in without the MFA code. Please help me regain access via identity verification.",
    status: "OPEN", category: "ACCOUNT",
    fromName: "Reagan Washington", fromEmail: "r.washington@mfaissue.com", source: "EMAIL",
  },
  {
    subject: "Set up SAML SSO for our company domain",
    body: "We're on the Enterprise plan and want to configure SAML SSO with our Okta identity provider. We have the metadata XML ready.",
    status: "IN_PROGRESS", category: "ACCOUNT",
    fromName: "Parker Butler", fromEmail: "p.butler@enterprise.com", source: "WEB",
  },
  {
    subject: "Remove ex-employee from account immediately",
    body: "An employee was terminated this morning. Please deactivate their account (james.ex@ourcompany.com) urgently to prevent any unauthorised access.",
    status: "CLOSED", category: "ACCOUNT",
    fromName: "Mackenzie Simmons", fromEmail: "m.simmons@hr.co", source: "EMAIL",
  },
  {
    subject: "Temporary admin access needed for IT security audit",
    body: "Our external auditors need read-only admin access to review configurations and audit logs for our compliance audit next week. 5-day access window.",
    status: "OPEN", category: "ACCOUNT",
    fromName: "Hayden Foster", fromEmail: "h.foster@audit.org", source: "WEB",
  },
  {
    subject: "Organisation name update after company rebrand",
    body: "We've completed a rebrand from 'Acme Corp' to 'Apex Solutions'. Can you update the organisation name across our account and invoices?",
    status: "CLOSED", category: "ACCOUNT",
    fromName: "Avery Gonzales", fromEmail: "a.gonzales@rebrand.co", source: "EMAIL",
  },
  {
    subject: "Configure IP allowlist to restrict account access",
    body: "For security reasons we'd like to restrict logins to our office IP ranges (203.0.113.0/24 and 198.51.100.0/24). Is this configurable on our plan?",
    status: "IN_PROGRESS", category: "ACCOUNT",
    fromName: "Rowan Diaz", fromEmail: "r.diaz@securityteam.com", source: "WEB",
  },
];

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function seed() {
  const now = Date.now();
  // Spread tickets evenly over the last 90 days (oldest first in the array)
  const totalMs = 90 * 24 * 60 * 60 * 1000;
  const stepMs = totalMs / (TICKETS.length - 1);

  let created = 0;
  let skipped = 0;

  for (const [i, ticket] of TICKETS.entries()) {
    const existing = await prisma.ticket.findFirst({
      where: { subject: ticket.subject },
    });
    if (existing) {
      skipped++;
      continue;
    }

    const createdAt = new Date(now - totalMs + i * stepMs);

    await prisma.ticket.create({
      data: {
        id: crypto.randomUUID(),
        subject: ticket.subject,
        body: ticket.body,
        status: ticket.status,
        category: ticket.category,
        fromName: ticket.fromName,
        fromEmail: ticket.fromEmail,
        source: ticket.source,
        createdAt,
        updatedAt: createdAt,
      },
    });
    created++;
  }

  console.log(`Done — ${created} created, ${skipped} skipped (already existed).`);
}

seed()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
