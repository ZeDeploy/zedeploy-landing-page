const features = [
  "24/7 Expert Support",
  "99.99% Uptime Guarantee",
  "Auto-Scaling Capabilities",
  "Cost Optimization",
  "Multi-Cloud Integration",
  "Disaster Recovery",
  "Compliance & Security",
  "Dedicated Account Manager",
];

export default function Infrastructure() {
  return (
    <section className="infrastructure" id="infrastructure">
      <div className="infrastructure-container">
        <div className="infra-content">
          <div className="infra-text">
            <h2>Why Choose ZeDeploy?</h2>
            <p>
              We specialize in building cloud infrastructure for startups and
              enterprises. Whether you&apos;re launching your first product or
              scaling to millions of users, we provide the foundation for
              success.
            </p>
            <ul className="feature-list">
              {features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </div>
          <div className="infra-visual">
            <svg
              viewBox="0 0 300 300"
              xmlns="http://www.w3.org/2000/svg"
              className="infra-animation"
              role="img"
              aria-label="ZeDeploy logo surrounded by animated infrastructure orbits"
            >
              <defs>
                <clipPath id="zd-logo-clip">
                  <rect x="95" y="95" width="110" height="110" rx="24" />
                </clipPath>
              </defs>

              {/* Expanding ripple pulses */}
              <circle className="ripple ripple-1" cx="150" cy="150" r="112" />
              <circle className="ripple ripple-2" cx="150" cy="150" r="112" />

              {/* Rotating dashed rings */}
              <g className="spin-slow">
                <circle
                  className="ring ring-dashed"
                  cx="150"
                  cy="150"
                  r="118"
                />
              </g>
              <g className="spin-reverse">
                <circle
                  className="ring ring-dotted"
                  cx="150"
                  cy="150"
                  r="132"
                />
              </g>

              {/* Orbiting infrastructure nodes */}
              <g className="orbit orbit-a">
                <circle className="node node-gold" cx="150" cy="32" r="6" />
                <circle className="node node-white" cx="268" cy="150" r="4.5" />
              </g>
              <g className="orbit orbit-b">
                <circle className="node node-white" cx="32" cy="150" r="4.5" />
                <circle className="node node-gold" cx="150" cy="268" r="6" />
              </g>

              {/* Center tile with ZeDeploy logo */}
              <g className="float">
                <rect
                  x="93"
                  y="93"
                  width="114"
                  height="114"
                  rx="26"
                  className="tile"
                />
                <image
                  href="/zedeploy_logo.png"
                  x="95"
                  y="95"
                  width="110"
                  height="110"
                  clipPath="url(#zd-logo-clip)"
                  preserveAspectRatio="xMidYMid slice"
                />
              </g>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
