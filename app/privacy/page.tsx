import Link from 'next/link'

export const metadata = {
  title: 'Privacy',
  description:
    'What this site collects (nothing), what leaves your browser, and how to verify both yourself.',
}

export default function PrivacyPage() {
  return (
    <div className="wrap narrow">
      <h1 style={{ marginTop: '2rem' }}>Privacy</h1>
      <p className="lede">
        This is an anti-surveillance project. It would be indefensible to run it on a pile
        of visitor data, so it does not collect any. Below is exactly what happens, and how
        to check it yourself rather than take our word for it.
      </p>

      <h2>What this site collects</h2>
      <p>
        Nothing. There are no accounts, no cookies, no analytics, no tracking pixels, no
        advertising, no session storage, and no logging of visitors.
      </p>
      <p>
        This is not a promise about how we behave — it is a property of how the site is
        built. Every page is a static file. There is no application server, no database
        running anywhere, and no backend that receives your input. There is nothing here
        that <em>could</em> record you, which is a stronger guarantee than a policy saying
        we choose not to.
      </p>

      <h2>Your address</h2>
      <p>
        When you look up your representatives, your address is sent from your browser
        directly to the <strong>United States Census Bureau</strong> geocoder, which
        returns your district. We are not in the middle of that request. Specifically:
      </p>
      <ul>
        <li>Your address is never transmitted to this site.</li>
        <li>It is never written to a URL, so it cannot leak through a link or referrer.</li>
        <li>It is never stored, in your browser or anywhere else.</li>
        <li>It exists only in your browser&rsquo;s memory, and disappears when you close the tab.</li>
      </ul>
      <p>
        The Census Bureau receives the address because it has to in order to answer the
        question. Their handling of it is governed by their own privacy policy, not ours.
        If you would rather not send it, enter only a ZIP code — the ZIP lookup runs
        entirely inside your browser against a table shipped with the site and contacts
        nobody at all.
      </p>

      <div className="callout">
        <p>
          <strong>Verify it yourself.</strong> Open your browser&rsquo;s developer tools,
          go to the Network tab, and run a lookup. You will see exactly one outbound
          request containing your address, to{' '}
          <span className="mono">geocoding.geo.census.gov</span>, and no request carrying
          it to this site. The address bar stays clean. That check takes about thirty
          seconds and you should not believe this page without doing it.
        </p>
      </div>

      <h2>Your name and town, on contact pages</h2>
      <p>
        The name and town you type when drafting a message stay in your browser and are
        used only to fill in the text. They are never transmitted to us.
      </p>
      <p>
        When you choose to send the message, you leave this site. Opening it in Gmail or
        Outlook hands the text to Google or Microsoft; using your own mail application
        hands it to your mail provider; pasting into an official contact form sends it to
        that office. Those are your choices and their systems, and this page cannot speak
        for any of them. The message itself is addressed to a public official about their
        public conduct, which is the point.
      </p>

      <h2>Third parties</h2>
      <p>
        The site loads no third-party fonts, scripts, frames, or images. A strict Content
        Security Policy blocks them at the browser level. The only external host the site
        contacts is the Census geocoder, and only when you ask it to look up an address.
      </p>
      <p>
        Links out to official records (the Clerk of the House, the Senate, members&rsquo;
        own websites) are ordinary links. Following one takes you to that site under its
        own terms.
      </p>

      <h2>If you are in the EU, UK, or California</h2>
      <p>
        We do not collect, process, store, sell, or share personal data, so there is no
        data to request, correct, port, or delete, and no sale to opt out of. If you
        contact us directly, we will have whatever you put in that message and nothing
        else.
      </p>

      <h2>Information about public officials</h2>
      <p>
        This site publishes the official acts of people holding or seeking public office:
        recorded votes, sponsorships, formal statements, and signed documents. It does not
        publish home addresses, personal contact details, family information, or private
        facts about officials, candidates, or their staff — and it will not. The contact
        details shown are the official public office numbers and forms that exist for
        exactly this purpose.
      </p>
      <p>
        See <Link href="/legal">Legal and corrections</Link> for how to challenge anything
        published here.
      </p>

      <div className="source">
        <p>
          If this page and the site&rsquo;s actual behaviour ever disagree, the behaviour
          is the bug and we want to know. Report it through the corrections process on the{' '}
          <Link href="/legal">legal page</Link>.
        </p>
      </div>
    </div>
  )
}
