import { getEnv } from "@/config/env";

export default function Home() {
  const env = getEnv();
  const statuses = [
    [
      "Telegram",
      Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_WEBHOOK_SECRET),
    ],
    [
      "Notion",
      Boolean(
        env.NOTION_TOKEN &&
        env.NOTION_CONTACTS_DATABASE_ID &&
        env.NOTION_TASKS_DATABASE_ID,
      ),
    ],
    [
      "AI extraction",
      env.EXTRACTION_PROVIDER === "openai"
        ? Boolean(env.OPENAI_API_KEY)
        : Boolean(env.ANTHROPIC_API_KEY),
    ],
    [
      "Team digest",
      env.EMAIL_PROVIDER === "resend"
        ? Boolean(env.RESEND_API_KEY)
        : Boolean(env.GMAIL_REFRESH_TOKEN),
    ],
  ] as const;
  return (
    <main className="shell">
      <nav>
        <a className="brand" href="#top">
          VF
        </a>
        <span>System overview</span>
        <a href="/api/health">Health endpoint ↗</a>
      </nav>
      <section className="hero" id="top">
        <div className="eyebrow">
          <span className="pulse" /> Research operations system
        </div>
        <h1>
          Research,
          <br />
          <em>routed clearly.</em>
        </h1>
        <p className="lede">
          VeinzFlow turns voice notes, links, conversations, and quick updates
          into a traceable Notion workspace—then keeps the whole four-person
          team aligned.
        </p>
        <div className="hero-actions">
          <a className="primary" href="#setup">
            Review setup
          </a>
          <a className="secondary" href="/api/health">
            Check service health
          </a>
        </div>
      </section>
      <section className="flow" aria-label="VeinzFlow workflow">
        <article>
          <span>01</span>
          <h2>Capture</h2>
          <p>
            Send a voice note, message, URL, caption, or document description
            through Telegram.
          </p>
        </article>
        <article>
          <span>02</span>
          <h2>Understand</h2>
          <p>
            Transcribe, clean, classify, and validate each update while
            preserving its original source.
          </p>
        </article>
        <article>
          <span>03</span>
          <h2>Route</h2>
          <p>
            Create contacts, resources, tasks, and project-log entries through
            deterministic Notion mappings.
          </p>
        </article>
        <article>
          <span>04</span>
          <h2>Align</h2>
          <p>
            Receive a concise project digest every two calendar days, with a
            reliable fallback if AI is unavailable.
          </p>
        </article>
      </section>
      <section className="status-grid" id="setup">
        <div>
          <p className="kicker">Live configuration</p>
          <h2>Connection status</h2>
          <p>
            These checks reveal only whether required settings exist—never their
            values or project data.
          </p>
        </div>
        <ul>
          {statuses.map(([name, ready]) => (
            <li key={name}>
              <span className={ready ? "ready" : "pending"} />
              {name}
              <b>{ready ? "Configured" : "Setup needed"}</b>
            </li>
          ))}
        </ul>
      </section>
      <section className="checklist">
        <p className="kicker">Launch path</p>
        <h2>Five steps from empty workspace to team flow</h2>
        <ol>
          <li>
            <span>1</span>
            <div>
              <b>Connect the Notion integration</b>
              <p>
                Share the VeinzFlow parent page and run the repeatable workspace
                setup.
              </p>
            </div>
          </li>
          <li>
            <span>2</span>
            <div>
              <b>Register the Telegram bot</b>
              <p>
                Add the four authorized identities and point the signed webhook
                at this deployment.
              </p>
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <b>Select AI providers</b>
              <p>
                Use OpenAI or Anthropic for extraction and digests without
                changing the pipeline.
              </p>
            </div>
          </li>
          <li>
            <span>4</span>
            <div>
              <b>Connect team email</b>
              <p>Choose Gmail OAuth or Resend for the two-day digest.</p>
            </div>
          </li>
          <li>
            <span>5</span>
            <div>
              <b>Verify and deploy</b>
              <p>
                Run the local checks, add protected settings to Vercel, and send
                a test update.
              </p>
            </div>
          </li>
        </ol>
      </section>
      <footer>
        <span>VeinzFlow</span>
        <p>
          Private by design. Original transcripts and cleaned summaries stay
          traceable; raw audio is not retained.
        </p>
        <a href="/api/health">System health ↗</a>
      </footer>
    </main>
  );
}
