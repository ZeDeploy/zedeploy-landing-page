const stats = [
  { value: "500+", label: "Deployments per day" },
  { value: "99.99%", label: "Uptime guarantee" },
  { value: "150+", label: "Enterprise clients" },
  { value: "<2m", label: "Average response time" },
];

export default function Stats() {
  return (
    <section className="stats">
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
