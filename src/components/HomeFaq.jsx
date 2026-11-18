import { FAQ_QUESTIONS } from "../data/homeFaq.js";
export default function HomeFaq() {
  return (
    <section className="home-faq" aria-labelledby="home-faq-title">
      <header>
        <span className="sample-trip-kicker">Before you hit the road</span>
        <h2 id="home-faq-title">A few things to know.</h2>
      </header>
      <p>This FAQ is a guide to planning college football road trips with Kickoff Miles, including accounts, schedules, and bookings.</p>
      <div className="home-faq-questions">
        {FAQ_QUESTIONS.map(({ question, answer }) => (
          <details key={question} className="home-faq-item">
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
