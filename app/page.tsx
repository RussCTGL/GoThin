export default function Home() {
  return (
    <section>
      <h1>AI fitness coach that tracks meals, weight, and progress for you.</h1>
      <p className="muted">
        Log what you ate in plain English, get calorie and protein estimates, and
        ask the coach for direct, supportive advice based on your day.
      </p>
      <div className="cards">
        <a className="card" href="/meal">
          <h2>Log a meal →</h2>
          <p>Describe what you ate; the AI estimates calories and macros.</p>
        </a>
        <a className="card" href="/coach">
          <h2>Ask the coach →</h2>
          <p>Get practical, no-shame advice that uses your targets and trend.</p>
        </a>
      </div>
    </section>
  );
}
