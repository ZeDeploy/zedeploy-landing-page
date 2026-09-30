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
              <stop offset="0%" stopColor="#e4dc3c" stopOpacity="0.28" />
              <stop offset="60%" stopColor="#e4dc3c" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#e4dc3c" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="zd-growth-stroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#e4dc3c" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#e4dc3c" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* Rising area under the growth curve (3 peaks, trending upward) */}
          <path
            d="M 0 810 C 140 690 200 540 280 540 C 360 540 420 660 460 660 C 540 660 620 360 720 360 C 800 360 860 480 920 480 C 1000 480 1080 170 1180 170 C 1280 170 1360 110 1440 80 L 1440 900 L 0 900 Z"
            fill="url(#zd-growth-fill)"
          />

          {/* Rising growth line with peaks (draws itself on load) */}
          <path
            className="stats-growth-line"
            d="M 0 810 C 140 690 200 540 280 540 C 360 540 420 660 460 660 C 540 660 620 360 720 360 C 800 360 860 480 920 480 C 1000 480 1080 170 1180 170 C 1280 170 1360 110 1440 80"
            fill="none"
            stroke="url(#zd-growth-stroke)"
            strokeWidth="2.5"
          />

          {/* Data points ride forward along the growth line */}
          <g fill="#e4dc3c" opacity="0.85">
            <circle className="stats-growth-dot" cx="0" cy="0" r="5" />
            <circle className="stats-growth-dot" cx="0" cy="0" r="4" />
            <circle className="stats-growth-dot" cx="0" cy="0" r="5" />
            <circle className="stats-growth-dot" cx="0" cy="0" r="4" />
            <circle className="stats-growth-dot" cx="0" cy="0" r="5" />
            <circle className="stats-growth-dot" cx="0" cy="0" r="4" />
            <circle className="stats-growth-dot" cx="0" cy="0" r="5" />
            <circle className="stats-growth-dot" cx="0" cy="0" r="4" />
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
