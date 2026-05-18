import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service · Hirely",
  description:
    "The agreement between you and Hirely covering your use of the app.mindoutreach.com service.",
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

export default function TermsPage() {
  return (
    <article>
      <H1>Terms of Service</H1>
      <p className="mt-3 font-mono text-[11.5px] uppercase tracking-wider text-muted-foreground">
        Effective {EFFECTIVE_DATE}
      </p>

      <P>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your access to
        and use of Hirely (the &ldquo;Service&rdquo;) at{" "}
        <a
          className="cursor-pointer underline underline-offset-2 hover:text-foreground"
          href="https://app.mindoutreach.com"
        >
          app.mindoutreach.com
        </a>
        . By creating an account or otherwise using the Service, you agree
        to be bound by these Terms.
      </P>

      <H2>1. Eligibility</H2>
      <P>
        You must be at least 13 years old (or the equivalent age of majority
        in your jurisdiction) to use the Service. By using the Service you
        represent that you meet this requirement.
      </P>

      <H2>2. Account</H2>
      <P>
        You are responsible for maintaining the confidentiality of your
        account credentials and for all activity that occurs under your
        account. Notify us immediately at{" "}
        <a
          className="cursor-pointer underline underline-offset-2 hover:text-foreground"
          href="mailto:security@mindoutreach.com"
        >
          security@mindoutreach.com
        </a>{" "}
        if you suspect unauthorized access to your account.
      </P>

      <H2>3. Acceptable use</H2>
      <P>You agree not to:</P>
      <UL>
        <li>
          Use the Service to violate any applicable law or third-party right.
        </li>
        <li>
          Reverse engineer, decompile, or attempt to extract the source code
          of the Service except to the extent expressly permitted by law.
        </li>
        <li>
          Scrape, harvest, or programmatically extract data from the Service
          beyond the limits of any API we publicly document.
        </li>
        <li>
          Resell, sublicense, or commercially redistribute the Service
          without our prior written consent.
        </li>
        <li>
          Use the Service to send spam, phishing, or otherwise harmful
          communications.
        </li>
        <li>
          Interfere with or disrupt the integrity or performance of the
          Service (e.g. denial-of-service, exploitation of vulnerabilities).
        </li>
        <li>
          Use the Service to apply to roles using identities or
          qualifications you do not have, or to misrepresent your candidacy
          to employers.
        </li>
      </UL>

      <H2>4. Connected accounts and content</H2>
      <P>
        Some features of the Service require you to connect a third-party
        account (currently, your Google account, granting access to Gmail
        and Calendar). You represent that you have the right to grant us
        access to that account and the data within it, and you may revoke
        that access at any time. Our handling of data from connected
        accounts is described in our{" "}
        <a
          className="cursor-pointer underline underline-offset-2 hover:text-foreground"
          href="/privacy"
        >
          Privacy Policy
        </a>
        .
      </P>
      <P>
        You retain ownership of all content you submit to, or that we access
        on your behalf through, the Service (&ldquo;Your Content&rdquo;). You
        grant Hirely a worldwide, non-exclusive, royalty-free license to
        store, copy, and process Your Content solely to provide the Service
        to you.
      </P>

      <H2>5. AI features</H2>
      <P>
        The Service uses third-party large language models to classify
        emails and draft replies. AI-generated drafts are placed in your
        Drafts folder for your review; Hirely does not send messages on your
        behalf without your explicit click. Output produced by AI may
        contain errors or inaccuracies — review it before sending.
      </P>

      <H2>6. Subscriptions and payment</H2>
      <P>
        Some features may require a paid subscription. Pricing and billing
        terms will be presented at the point of purchase. Unless required by
        applicable law, subscription fees are non-refundable. We may change
        our prices on 30 days&rsquo; notice; changes do not apply to the
        current billing period.
      </P>

      <H2>7. Service availability</H2>
      <P>
        We strive to keep the Service available but do not guarantee
        uninterrupted access. We may modify, suspend, or discontinue any
        part of the Service at any time, with reasonable notice where
        practicable.
      </P>

      <H2>8. Termination</H2>
      <P>
        You may stop using the Service at any time and delete your account
        from the Service&rsquo;s settings. We may suspend or terminate your
        account if you materially breach these Terms, including the
        Acceptable Use section above. Sections that by their nature should
        survive termination (intellectual property, disclaimers, limitations
        of liability, governing law) will survive.
      </P>

      <H2>9. Disclaimers</H2>
      <P>
        THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS
        AVAILABLE&rdquo;, WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR
        IMPLIED, INCLUDING WITHOUT LIMITATION WARRANTIES OF MERCHANTABILITY,
        FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT. HIRELY DOES
        NOT WARRANT THAT THE SERVICE WILL BE ERROR-FREE OR THAT
        AI-GENERATED OUTPUT WILL BE ACCURATE.
      </P>

      <H2>10. Limitation of liability</H2>
      <P>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, HIRELY WILL NOT BE LIABLE
        FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
        DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, ARISING OUT OF OR
        RELATED TO YOUR USE OF THE SERVICE. HIRELY&rsquo;S TOTAL LIABILITY
        FOR ANY CLAIM ARISING OUT OF OR RELATED TO THESE TERMS OR THE
        SERVICE WILL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID
        HIRELY IN THE TWELVE MONTHS PRECEDING THE EVENT GIVING RISE TO THE
        CLAIM, OR (B) USD $100.
      </P>

      <H2>11. Indemnification</H2>
      <P>
        You agree to indemnify and hold harmless Hirely, its officers,
        directors, employees, and agents from any claim or demand,
        including reasonable attorneys&rsquo; fees, arising out of your use
        of the Service, your Content, or your violation of these Terms.
      </P>

      <H2>12. Governing law and disputes</H2>
      <P>
        These Terms are governed by the laws of the State of Delaware,
        United States, without regard to its conflict of laws rules. The
        state and federal courts located in Delaware will have exclusive
        jurisdiction over any dispute arising out of or related to these
        Terms, except that either party may seek injunctive relief in any
        court of competent jurisdiction.
      </P>

      <H2>13. Changes to these Terms</H2>
      <P>
        We may update these Terms from time to time. We will announce
        material changes via email to your account address at least 30 days
        before they take effect. Continued use of the Service after the
        effective date constitutes acceptance of the updated Terms.
      </P>

      <H2>14. Contact</H2>
      <P>
        Questions about these Terms:{" "}
        <a
          className="cursor-pointer underline underline-offset-2 hover:text-foreground"
          href="mailto:support@mindoutreach.com"
        >
          support@mindoutreach.com
        </a>
        .
      </P>
    </article>
  );
}
