# Privacy and Cookies

_Last updated: September 22, 2026_

Quizmon is an open-source Pokémon knowledge game. This policy covers what we collect, how we use it, and your rights.

## Data Controller

Itay Raveh operates Quizmon and is responsible for the information described in this policy. For privacy questions, contact <quizmon@raveh.dev>.

## On Your Device

Guest progress stays in your browser, alongside files cached for offline play. If you sign in, completed progress and selected profile and game preferences also sync to your account. Unfinished rounds stay on the device. Clearing site data removes local saves; it does not remove account data. Sign-in uses a session cookie.

## What We Collect

Guests have no Quizmon account identifier in game analytics or error reports. If you sign in, error reports, feedback, and diagnostic traces may be associated with your verified account ID and email address.

- **Game analytics** - Sentry records counts of page views, game starts, and saved completions, plus game mode and distributions of question counts, correct answers, score, duration, and content and scoring versions. We use these measurements to understand how the game is used. Individual answers, names, email addresses, and account IDs are not metric attributes.
- **Error reports and performance** - Sentry receives unexpected browser and Worker errors, limited diagnostic categories, sampled loading and service traces, and masked replay when a browser error occurs. Replay can show clicks, navigation, and screen layout; text, inputs, and media are masked. We do not intentionally send saves, sign-in codes, session tokens, or sync request bodies.
- **Bug reports (optional)** - If you choose Report a bug, your description and any name, email address, or screenshot you add are sent to Sentry. A screenshot may show information visible on your screen, so review it before sending. If you are signed in, the report can also carry your account ID and email address.
- **Website analytics** - Cloudflare Web Analytics uses no cookies or persistent visitor identifiers. It measures visits, referring pages, and loading and interaction performance to help us improve the site. Cloudflare discards IP addresses at its nearest data center. See its [analytics privacy information](https://developers.cloudflare.com/speed/observatory/rum-beacon/#privacy-information).
- **Daily reminders (optional)** - If you enable notifications, we store your browser's subscription identifier, push endpoint and keys, time zone, and last reported Daily completion date. We use these to send reminders and avoid reminding you about a Daily you have completed.
- **Accounts (optional)** - We store your email address, sign-in records, synced progress, friend requests, and friendships to provide sign-in, device sync, and leaderboards. Signing up includes eligible Daily results in Global leaderboards. Other signed-in players can see your Trainer name, partner Pokémon, friend code, and ranked results. Your email address and full save are private.
- **Correspondence** - If you contact us, we receive your email address and the information you send so we can respond.

You have no legal obligation to provide personal information. Accounts, reminders, and contact requests are optional. Without the relevant information, we cannot provide those features, but you can still play.

## Third-Party Services

- **Cloudflare** - Hosts and protects Quizmon, delivers images and sign-in emails, and stores reminder registrations. Account data is stored in our PostgreSQL database and synchronized through our self-hosted PowerSync service. Its security logs include IP addresses, requested paths, and timestamps to help detect abuse and troubleshoot traffic. [Cloudflare's privacy policy](https://www.cloudflare.com/privacypolicy/) describes its processing. Cloudflare may use [security cookies](https://developers.cloudflare.com/fundamentals/reference/policies-compliances/cloudflare-cookies/) to protect the site from malicious traffic.
- **Sentry** - Processes game metrics, errors, traces, optional bug reports, screenshots, and error-triggered replay for troubleshooting and product analysis. The Sentry organization stores data in its EU region. See [Sentry's privacy policy](https://sentry.io/privacy/).
- **Push delivery and email services** - Remote push services deliver reminders; email providers handle messages you send us.

These providers may process information outside your country. If you share a result or Trainer Card through another service, that service's privacy policy applies.

We do not sell your personal information or serve ads. Quizmon does not set advertising cookies. We may disclose information when required by law.

## Data Retention

Sentry's current free Developer plan retains event data for 30 days. Screenshot attachments are retained for up to 30 days. Cloudflare Web Analytics reports are available for six months. Cloudflare's security dashboard retains sampled traffic for up to seven days and security events for up to 24 hours.

Account progress and accepted Daily results have no automatic expiry. Signing out does not delete them. You can download your account data from Account. Account deletion is not available in the app; use the contact below for privacy requests.

Reminder registrations remain until you turn reminders off in Quizmon or the push service reports that the subscription is invalid; they have no fixed inactivity expiry. Deletion removes active reminder records and does not promise immediate removal of provider backup copies.

## Your Rights

**Stop reminders** by turning them off in Quizmon while online. This requests deletion of the server registration and cancels the subscription. Do this before clearing site data; clearing browser data alone does not guarantee server deletion.

Depending on applicable law, you may have rights to access, correction, deletion, portability, restriction, objection, withdrawal of consent, and a complaint to a privacy regulator. Contact <quizmon@raveh.dev> to make a request. We may need information to locate the relevant records. Guest game metrics have no Quizmon player identifier, and we cannot retrieve progress that has stayed only in your browser.

## Children's Privacy

Quizmon is intended for Pokémon fans generally. If you believe a child has provided personal information that requires our attention, contact us.

## Changes to This Policy

We may update this policy as the service changes and will update its date. Before introducing advertising, we will update the disclosures and provide applicable privacy choices.

---

_Adapted from [Automattic's Privacy Policy](https://github.com/Automattic/legalmattic/blob/master/Privacy-Policy.md) for Quizmon, licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)._
