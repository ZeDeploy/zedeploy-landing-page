const stats = [
  { value: "500+", label: "Deployments per day" },
  { value: "99.99%", label: "Uptime guarantee" },
  { value: "150+", label: "Enterprise clients" },
  { value: "<2m", label: "Average response time" },
];

export default function Stats() {
  return (
    <section className="stats">
      {/* Decorative growth chart in the background (purely presentational) */}
      <div className="stats-growth-bg" aria-hidden="true">
        <svg
          viewBox="0 0 1440 900"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMax slice"
        >
          <defs>
            <linearGradient id="zd-growth-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e4dc3c" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#e4dc3c" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="zd-growth-stroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#e4dc3c" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#e4dc3c" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* Rising area under the growth curve */}
          <path
            d="M 0 860 L 120 830 L 280 800 L 420 750 L 560 700 L 720 610 L 900 520 L 1100 380 L 1280 220 L 1440 90 L 1440 900 L 0 900 Z"
            fill="url(#zd-growth-fill)"
          />

          {/* Rising growth line (draws itself on load) */}
          <path
            className="stats-growth-line"
            d="M 0 860 L 120 830 L 280 800 L 420 750 L 560 700 L 720 610 L 900 520 L 1100 380 L 1280 220 L 1440 90"
            fill="none"
            stroke="url(#zd-growth-stroke)"
            strokeWidth="2.5"
          />

          {/* Data points pop in as the line passes them */}
          <g fill="#e4dc3c" opacity="0.85">
            <circle className="stats-growth-dot" cx="120" cy="830" r="4" />
            <circle className="stats-growth-dot" cx="280" cy="800" r="4" />
            <circle className="stats-growth-dot" cx="420" cy="750" r="4" />
            <circle className="stats-growth-dot" cx="560" cy="700" r="4" />
            <circle className="stats-growth-dot" cx="720" cy="610" r="4" />
            <circle className="stats-growth-dot" cx="900" cy="520" r="4" />
            <circle className="stats-growth-dot" cx="1100" cy="380" r="4" />
            <circle className="stats-growth-dot" cx="1280" cy="220" r="4" />
          </g>
        </svg>
      </div>

      <div className="stats-container">
        <div className="stats-grid">
          {stats.map((stat) => (
            <div key={stat.label} className="stat-item">
              <h4>{stat.value}</h4>
              <p>{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
