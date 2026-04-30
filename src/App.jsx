import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = "/api/tenders/";

function App() {
  const [tenders, setTenders] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [province, setProvince] = useState("All");
  const [category, setCategory] = useState("All");
  const [esubmission, setEsubmission] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  useEffect(() => {
    async function fetchTenders() {
      try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("Failed to fetch tenders");
        const data = await response.json();
        setTenders(data.tenders || []);
        setTotal(data.total || 0);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchTenders();
  }, []);

  const provinces = useMemo(() => ["All", ...new Set(tenders.map(t => t.province).filter(Boolean))].sort(), [tenders]);
  const categories = useMemo(() => ["All", ...new Set(tenders.map(t => t.category).filter(Boolean))].sort(), [tenders]);

  const filtered = useMemo(() => {
    return tenders.filter(t => {
      const text = `${t.description} ${t.tender_number} ${t.organ_of_state} ${t.province} ${t.category}`.toLowerCase();
      return (
        text.includes(search.toLowerCase()) &&
        (province === "All" || t.province === province) &&
        (category === "All" || t.category === category) &&
        (esubmission === "All" || t.esubmission === esubmission)
      );
    });
  }, [tenders, search, province, category, esubmission]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const kpis = useMemo(() => ({
    total: tenders.length,
    filtered: filtered.length,
    esub: filtered.filter(t => t.esubmission === "Allowed").length,
    provinces: new Set(filtered.map(t => t.province).filter(Boolean)).size,
    institutions: new Set(filtered.map(t => t.organ_of_state).filter(Boolean)).size,
    briefing: filtered.filter(t => t.has_briefing_session === "Yes").length,
  }), [tenders, filtered]);

  function exportExcel() {
    const headers = ["Tender Number","Description","Institution","Province","Category","Closing Date","eSubmission","Contact","Email","Telephone"];
    const rows = filtered.map(t => [
      t.tender_number, t.description, t.organ_of_state, t.province,
      t.category, t.closing_date, t.esubmission, t.contact_person,
      t.email, t.telephone_number
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${(v||'').replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tenders_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }

  if (loading) return <div className="center">Loading tenders...</div>;
  if (error) return <div className="center error">{error}</div>;

  return (
    <div className="app">
      {/* Header */}
      <header className="topbar">
        <div className="topbar-left">
          <h1>SA Tenders Dashboard</h1>
          <span className="topbar-sub">etenders.gov.za — live data</span>
        </div>
        <button className="export-btn" onClick={exportExcel}>Export CSV</button>
      </header>

      {/* KPIs */}
      <div className="kpi-row">
        <div className="kpi"><div className="kpi-label">Total tenders</div><div className="kpi-value">{kpis.total.toLocaleString()}</div></div>
        <div className="kpi"><div className="kpi-label">Filtered</div><div className="kpi-value">{kpis.filtered.toLocaleString()}</div></div>
        <div className="kpi"><div className="kpi-label">eSubmission allowed</div><div className="kpi-value">{kpis.esub.toLocaleString()}</div></div>
        <div className="kpi"><div className="kpi-label">Provinces</div><div className="kpi-value">{kpis.provinces}</div></div>
        <div className="kpi"><div className="kpi-label">Institutions</div><div className="kpi-value">{kpis.institutions}</div></div>
        <div className="kpi"><div className="kpi-label">With briefing</div><div className="kpi-value">{kpis.briefing.toLocaleString()}</div></div>
      </div>

      {/* Filters */}
      <div className="filters">
        <input
          type="text"
          placeholder="Search description, tender number, institution..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
        <select value={province} onChange={e => { setProvince(e.target.value); setPage(1); }}>
          {provinces.map(p => <option key={p}>{p}</option>)}
        </select>
        <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}>
          {categories.map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={esubmission} onChange={e => { setEsubmission(e.target.value); setPage(1); }}>
          <option value="All">All submission types</option>
          <option value="Allowed">eSubmission allowed</option>
          <option value="Not Allowed">Not allowed</option>
        </select>
        <button className="reset-btn" onClick={() => { setSearch(""); setProvince("All"); setCategory("All"); setEsubmission("All"); setPage(1); }}>Reset</button>
      </div>

      {/* Table */}
      <div className="table-container">
        <div className="table-meta">
          <span>Showing {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, filtered.length)} of {filtered.length} tenders</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Tender number</th>
                <th>Description</th>
                <th>Institution</th>
                <th>Province</th>
                <th>Category</th>
                <th>Closing date</th>
                <th>eSubmission</th>
                <th>Briefing</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(t => (
                <tr key={t.id} onClick={() => setSelected(t)} className="clickable-row">
                  <td className="mono">{t.tender_number || "—"}</td>
                  <td className="desc">{t.description || "—"}</td>
                  <td>{t.organ_of_state || "—"}</td>
                  <td><span className="pill pill-blue">{t.province || "—"}</span></td>
                  <td>{t.category || "—"}</td>
                  <td>{t.closing_date || "—"}</td>
                  <td>
                    <span className={`pill ${t.esubmission === "Allowed" ? "pill-green" : "pill-gray"}`}>
                      {t.esubmission || "—"}
                    </span>
                  </td>
                  <td>
                    <span className={`pill ${t.has_briefing_session === "Yes" ? "pill-orange" : "pill-gray"}`}>
                      {t.has_briefing_session || "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="pagination">
          <button disabled={page === 1} onClick={() => setPage(1)}>First</button>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
          <button disabled={page >= totalPages} onClick={() => setPage(totalPages)}>Last</button>
        </div>
      </div>

      {/* Detail Panel */}
      {selected && (
        <div className="overlay" onClick={() => setSelected(null)}>
          <div className="panel" onClick={e => e.stopPropagation()}>
            <div className="panel-header">
              <div>
                <h2>{selected.tender_number}</h2>
                <p className="panel-institution">{selected.organ_of_state}</p>
              </div>
              <button className="close-btn" onClick={() => setSelected(null)}>✕</button>
            </div>

            <p className="panel-description">{selected.description}</p>

            <div className="panel-grid">
              <div className="panel-section">
                <div className="panel-section-title">Tender details</div>
                <Row label="Province" value={selected.province} />
                <Row label="Category" value={selected.category} />
                <Row label="Tender type" value={selected.tender_type} />
                <Row label="eSubmission" value={selected.esubmission} />
                <Row label="Date published" value={selected.date_published} />
                <Row label="Closing date" value={selected.closing_date} />
                <Row label="Closing time" value={selected.closing_time} />
                <Row label="Requirement place" value={selected.requirement_place} />
                <Row label="Special conditions" value={selected.special_conditions} />
              </div>

              <div className="panel-section">
                <div className="panel-section-title">Contact information</div>
                <Row label="Contact person" value={selected.contact_person} />
                <Row label="Email" value={selected.email} isEmail />
                <Row label="Telephone" value={selected.telephone_number} />
                <Row label="Fax" value={selected.fax_number} />
              </div>

              <div className="panel-section">
                <div className="panel-section-title">Briefing session</div>
                <Row label="Has briefing" value={selected.has_briefing_session} />
                <Row label="Is compulsory" value={selected.is_compulsory} />
                <Row label="Date and time" value={selected.briefing_date_time} />
                <Row label="Venue" value={selected.briefing_venue} />
              </div>

              {selected.tender_documents && (
                <div className="panel-section full-width">
                  <div className="panel-section-title">Tender documents</div>
                  <div className="documents">
                    {selected.tender_documents.split(";").map((doc, i) => {
                      const match = doc.match(/^(.*?)\((https?:\/\/[^)]+)\)$/);
                      if (match) {
                        return (
                          <a key={i} href={match[2].trim()} target="_blank" rel="noreferrer" className="doc-link">
                            {match[1].trim()}
                          </a>
                        );
                      }
                      return <span key={i} className="doc-link">{doc.trim()}</span>;
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, isEmail }) {
  if (!value || value === "null") return null;
  return (
    <div className="row">
      <span className="row-label">{label}</span>
      {isEmail
        ? <a href={`mailto:${value}`} className="row-value link">{value}</a>
        : <span className="row-value">{value}</span>
      }
    </div>
  );
}

export default App;