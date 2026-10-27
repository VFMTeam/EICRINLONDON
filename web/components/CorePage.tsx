// Page shell matching the original theme's page.php layout.
export default function CorePage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main id="main-content">
      <section className="core-page-shell">
        <div className="core-page-wrap">
          <header className="core-page-header">
            <p>Landlord certificates in London</p>
            <h1>{title}</h1>
          </header>
          <div className="core-page-content">{children}</div>
        </div>
      </section>
    </main>
  );
}
