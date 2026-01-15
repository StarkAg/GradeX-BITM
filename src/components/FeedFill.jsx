import React from 'react';

const EXTENSION_URL = 'https://chromewebstore.google.com/detail/srm-academia-course-feedb/piehdecbakkkhnhfabcgbmdpdohflofl';
const ACADEMIA_URL = 'https://academia.srmist.edu.in/#Course_Feedback';

const steps = [
  {
    title: 'Install from Chrome Web Store',
    detail: 'Hit “Add to Chrome”, confirm the permission prompt, and keep the extension pinned so it is one click away during review time.',
  },
  {
    title: 'Open the SRM Academia feedback page',
    detail: 'Navigate to the official SRM Academia course feedback form (after logging in). Click the extension as shown in the screenshot below so it recognizes the page automatically.',
  },
  {
    title: 'Set the two required fields',
    detail: 'Pick a rating (Excellent/Very Good/Good/Average/Poor) from the dropdown and type a concise comment—those are the only fields FeedFill touches.',
  },
  {
    title: 'Press “Fill Feedback Form”',
    detail: 'Click the blue Fill button, review the populated answers, then submit the form yourself. Keep things honest even when automation handles the repetitive steps.',
  },
];

const tips = [
  'Only the Rating dropdown and Comment text box are auto-filled, so keep the rest of the form checked manually before submitting.',
  'FeedFill does not store data online—Chrome keeps everything local. Switching laptops means reinstalling from the store.',
  'Use automation responsibly: personalized, constructive feedback is still expected by SRM.',
];

export default function FeedFill() {
  return (
    <section className="feedfill-page">
      <div className="feedfill-card feedfill-hero">
        <div>
          <p className="feedfill-eyebrow">SRM Academia helper</p>
          <h2>FeedFill — one-click course feedback</h2>
          <p className="feedfill-description">
            Streamline the SRM Academia feedback routine with the SRM Academia Course Feedback Filler v1 by Another Dev. The tool focuses on the two inputs you actually need: Rating and Comment text.
          </p>
          <p className="feedfill-intro" style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-secondary)', letterSpacing: '0.02em', lineHeight: '1.6' }}>
            Need to blitz through SRM Academia feedback? Use the FeedFill helper below to install the one-click form filler responsibly.
          </p>
        </div>
        <div className="feedfill-cta">
          <div className="feedfill-cta-buttons">
            <a
              className="feedfill-button"
              href={EXTENSION_URL}
              target="_blank"
              rel="noreferrer noopener"
            >
              Open Chrome Web Store
            </a>
            <a
              className="feedfill-button secondary"
              href={ACADEMIA_URL}
              target="_blank"
              rel="noreferrer noopener"
            >
              Open SRM Academia
            </a>
          </div>
        </div>
      </div>

      <div className="feedfill-card">
        <div className="feedfill-credit">
          Give the creator props when you share FeedFill so more SRM students know who made their lives easier.
        </div>
      </div>

      <div className="feedfill-card">
        <h3>Usage guide</h3>
        <ol className="feedfill-steps">
          {steps.map((step, index) => (
            <li key={step.title}>
              <div className="feedfill-step-index">{index + 1}</div>
              <div>
                <p className="feedfill-step-title">{step.title}</p>
                <p className="feedfill-step-detail">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="feedfill-screenshot-card">
          <img
            src="/feedfill-feedback.png"
            alt="SRM Academia feedback form with rating dropdown and comment"
            className="feedfill-screenshot"
          />
          <p className="feedfill-screenshot-caption">
            Navigate to the official SRM Academia course feedback form (after logging in). Click the extension icon once you see this screen.
          </p>
        </div>
      </div>

      <div className="feedfill-card">
        <h3>Good-to-know</h3>
        <ul className="feedfill-tips">
          {tips.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
        <div className="feedfill-disclaimer">
          FeedFill simply links you to the official Chrome extension. Follow SRM’s honor code and provide genuine, constructive feedback even when automation accelerates the repetitive clicks.
        </div>
      </div>
    </section>
  );
}

