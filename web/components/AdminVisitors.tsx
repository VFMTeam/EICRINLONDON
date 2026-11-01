import { CLICK_EVENTS, type Period, type VisitorReport } from "@/lib/analytics";

const n = (v: number) => v.toLocaleString("en-GB");

function Column({ title, p }: { title: string; p: Period }) {
  return (
    <div>
      <h3>{title}</h3>
      <div className="adm-row"><span>Visitors</span><b>{n(p.visitors)}</b></div>
      <div className="adm-row"><span>Visits</span><b>{n(p.sessions)}</b></div>
      <div className="adm-row"><span>Page views</span><b>{n(p.views)}</b></div>
      {CLICK_EVENTS.map(([e, label]) => (
        <div key={e} className="adm-row"><span>{label}</span><b>{n(p.clicks[e] ?? 0)}</b></div>
      ))}
    </div>
  );
}

export default function AdminVisitors({ report }: { report: VisitorReport }) {
  return (
    <section className="adm-card wide">
      <h2>Visitors &amp; clicks</h2>
      {!report ? (
        <p className="adm-empty-note">Not connected</p>
      ) : "error" in report ? (
        <p className="adm-empty-note bad">{report.error}</p>
      ) : (
        <div className="adm-cols">
          <Column title="Last 7 days" p={report.week} />
          <Column title="Last 28 days" p={report.month} />
          <div>
            <h3>Top pages, 28 days</h3>
            {report.pages.map(([path, views]) => (
              <div key={path} className="adm-row"><span>{path}</span><b>{n(views)}</b></div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
