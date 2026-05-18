import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy · Hirely",
  description:
    "How Hirely collects, uses, stores, and shares user data, including data from Google APIs (Gmail and Calendar).",
};

function H1(props: { children: React.ReactNode }) {
  return (
    <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
      {props.children}
    </h1>
  );
}

function H2(props: { children: React.ReactNode }) {
  return (
    <h2 className="mt-10 text-xl font-semibold tracking-tight md:text-[22px]">
      {props.children}
    </h2>
  );
}

function H3(props: { children: React.ReactNode }) {
  return (
    <h3 className="mt-6 text-base font-semibold tracking-tight">
      {props.children}
    </h3>
  );
}

function P(props: { children: React.ReactNode }) {
  return (
    <p className="mt-3 text-[15px] leading-relaxed text-foreground/85">
      {props.children}
    </p>
  );
}

function UL(props: { children: React.ReactNode }) {
  return (
    <ul className="mt-3 list-disc space-y-2 pl-6 text-[15px] leading-relaxed text-foreground/85 marker:text-muted-foreground">
      {props.children}
    </ul>
  );
}

const EFFECTIVE_DATE = "May 18, 2026";

export default function PrivacyPage() {
  return (
    <article>
      <H1>Privacy Policy</H1>
      <p className="mt-3 font-mono text-[11.5px] uppercase tracking-wider text-muted-foreground">
        Effective {EFFECTIVE_DATE}
      </p>

      <P>
        This Privacy Policy explains how Hirely (&ldquo;we&rdquo;,
        &ldquo;us&rdquo;, &ldquo;our&rdquo;) collects, uses, stores, and
        shares information when you use{" "}
        <a
          className="cursor-pointer underline underline-offset-2 hover:text-foreground"
          href="https://app.mindoutreach.com"
        >
          app.mindoutreach.com
        </a>{" "}
        (the &ldquo;Service&rdquo;). It also describes how we handle data we
        access from Google APIs (Gmail and Google Calendar) and the choices
        you have over that data.
      </P>

      <H2>1. Data we collect</H2>
      <H3>Account data</H3>
      <P>
        When you create an account we collect your email address, name, and
        a hashed password (or, if you sign in with Google, the Google profile
        information Google returns to us: name, email, and avatar URL).
      </P>
      <H3>Data from Google APIs</H3>
      <P>
        With your explicit consent on the Google consent screen, Hirely
        accesses the following from your Google account in order to power
        the product features described in this Policy:
      </P>
      <UL>
        <li>
          <b>Gmail messages (read-only).</b> Subject lines, sender, recipient,
          headers, body text, and labels of messages we identify as
          job-search-related (based on sender domains, subject keywords, and
          message content).
        </li>
        <li>
          <b>Gmail labels.</b> Permission to create and apply Hirely-prefixed
          labels (e.g. <code>Hirely / Interview</code>) on classified threads
          so they remain organized in your normal inbox.
        </li>
        <li>
          <b>Gmail compose &amp; modify.</b> Permission to draft replies and
          place them in your Drafts folder, and to mark classified threads as
          read or archived. Hirely never sends email on your behalf without
          your explicit click.
        </li>
        <li>
          <b>Calendar events (read).</b> Date, time, and attendee list of
          events on your primary calendar in the window relevant to your job
          search (to detect interview conflicts).
        </li>
        <li>
          <b>Calendar events (create).</b> Permission to create new events on
          your primary calendar for interviews that you confirm through
          Hirely. We do not modify or delete events we did not create.
        </li>
      </UL>

      <H3>Usage data</H3>
      <P>
        We collect standard product analytics (pages visited, features used,
        approximate geolocation derived from IP) to understand how the
        Service is used and to debug issues. We do not link analytics events
        to Google API data.
      </P>

      <H2>2. How we use your data</H2>
      <UL>
        <li>
          To classify your job-search emails by stage (Applied, Phone screen,
          Interview, Offer, Rejected) and present them as a pipeline in the
          Service.
        </li>
        <li>
          To detect when a recruiter has proposed an interview time and check
          your Calendar for conflicts.
        </li>
        <li>
          To draft replies in your voice and place them in your Drafts folder
          for your review.
        </li>
        <li>
          To create confirmed interview events on your Calendar when you
          accept a recruiter&rsquo;s proposal through the Service.
        </li>
        <li>
          To send you transactional and account-related email (welcome,
          verification, password reset, security alerts) and product reminders
          you have not opted out of.
        </li>
        <li>To debug, improve, and secure the Service.</li>
      </UL>

      <H2>3. Limited Use of Google user data</H2>
      <P>
        Hirely&rsquo;s use and transfer to any other app of information
        received from Google APIs will adhere to the{" "}
        <a
          className="cursor-pointer underline underline-offset-2 hover:text-foreground"
          href="https://developers.google.com/terms/api-services-user-data-policy"
        >
          Google API Services User Data Policy
        </a>
        , including the Limited Use requirements. Specifically:
      </P>
      <UL>
        <li>
          We use Gmail and Calendar data only to provide and improve the
          user-facing features described above.
        </li>
        <li>
          We do not transfer this data to others except as necessary to
          provide the Service, for security purposes, to comply with
          applicable law, or as part of a merger, acquisition, or sale of
          assets with notice to you.
        </li>
        <li>
          We do not use Gmail or Calendar data for serving advertisements,
          and we never sell this data.
        </li>
        <li>
          We do not allow humans to read this data unless we have your
          affirmative agreement for specific messages, we are doing so for
          security purposes (e.g. investigating abuse), to comply with
          applicable law, or for Hirely&rsquo;s internal operations (and even
          then the data is aggregated and anonymized).
        </li>
      </UL>

      <H2>4. Storage and security</H2>
      <UL>
        <li>
          <b>OAuth tokens.</b> The refresh and access tokens we receive from
          Google are stored encrypted at rest on AWS RDS (Postgres) and
          transmitted only over TLS 1.2+.
        </li>
        <li>
          <b>Email content.</b> We do not retain message bodies long-term.
          Once a message has been classified we store only the result
          (sender domain, subject line, classification, message ID) so the
          pipeline can be reconstructed without re-reading your inbox.
        </li>
        <li>
          <b>Calendar events.</b> We store only the IDs and time windows of
          events relevant to your job search, not free/busy text from
          unrelated events.
        </li>
        <li>
          <b>Infrastructure.</b> The Service runs on Amazon Web Services in
          the United States. Access to production systems is restricted to
          named individuals with multi-factor authentication.
        </li>
      </UL>

      <H2>5. Retention and deletion</H2>
      <P>
        You can disconnect Google at any time from your account settings.
        When you disconnect, we revoke the OAuth tokens with Google and
        delete any cached Gmail and Calendar data within 24 hours. If you
        delete your Hirely account we delete all account and analytics data
        associated with you within 30 days, except where retention is
        required by law.
      </P>

      <H2>6. AI and machine learning</H2>
      <P>
        We use third-party large language models (currently from Anthropic
        and OpenAI) to classify email content and draft replies. These
        providers are bound by data processing agreements that prohibit them
        from retaining your data, training their models on your data, or
        sharing your data with other customers. We do not use your Gmail or
        Calendar data to train any model, including any model of our own.
      </P>

      <H2>7. Sharing your data</H2>
      <P>
        We share your data only with:
      </P>
      <UL>
        <li>
          <b>Subprocessors</b> we use to operate the Service (AWS for
          hosting, Resend for transactional email, Anthropic/OpenAI for
          model inference, Vercel for static hosting of the web app, Inngest
          for background-job orchestration). Each subprocessor is bound by a
          data processing agreement consistent with this Policy.
        </li>
        <li>
          <b>Legal requests</b> where we are required to disclose data by
          law, valid subpoena, or court order.
        </li>
        <li>
          <b>Successor entities</b> in the event of a merger, acquisition, or
          sale of substantially all of our assets, in which case we will
          notify you and give you the opportunity to delete your data first.
        </li>
      </UL>
      <P>
        We do not sell your data. We do not share your Gmail or Calendar
        data for advertising purposes.
      </P>

      <H2>8. Your rights and choices</H2>
      <UL>
        <li>
          <b>Access &amp; export.</b> You can request a copy of the data we
          hold about you by emailing{" "}
          <a
            className="cursor-pointer underline underline-offset-2 hover:text-foreground"
            href="mailto:privacy@mindoutreach.com"
          >
            privacy@mindoutreach.com
          </a>
          .
        </li>
        <li>
          <b>Correction.</b> You can correct your account information from
          the Service&rsquo;s settings, or request correction by email.
        </li>
        <li>
          <b>Deletion.</b> You can delete your account from the Service&rsquo;s
          settings or by emailing us.
        </li>
        <li>
          <b>Revoke Google access.</b> You can revoke Hirely&rsquo;s access to
          your Google account at any time at{" "}
          <a
            className="cursor-pointer underline underline-offset-2 hover:text-foreground"
            href="https://myaccount.google.com/permissions"
          >
            myaccount.google.com/permissions
          </a>
          .
        </li>
      </UL>

      <H2>9. Children</H2>
      <P>
        The Service is not directed to children under 13 (or the equivalent
        age of majority in your jurisdiction). We do not knowingly collect
        data from children.
      </P>

      <H2>10. International users</H2>
      <P>
        The Service is operated from the United States. If you use the
        Service from outside the United States, you consent to the transfer
        of your data to the United States for processing as described in
        this Policy.
      </P>

      <H2>11. Changes to this Policy</H2>
      <P>
        We may update this Policy from time to time. Material changes will
        be announced via email to your account address at least 30 days
        before they take effect.
      </P>

      <H2>12. Contact</H2>
      <P>
        Privacy questions, complaints, or data requests:{" "}
        <a
          className="cursor-pointer underline underline-offset-2 hover:text-foreground"
          href="mailto:privacy@mindoutreach.com"
        >
          privacy@mindoutreach.com
        </a>
        .
      </P>
    </article>
  );
}
