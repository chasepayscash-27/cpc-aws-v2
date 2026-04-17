import { useEffect, useState } from 'react';
import { loadCsv } from '../utils/csv';
import '../App.css';

interface TeamMember {
  Name?: string;
  Position?: string;
  Email?: string;
}

interface TeamCsvRow {
  employee_name?: string;
  '\uFEFFemployee_name'?: string;
  employee_job_title?: string;
  employee_email?: string;
}

const TeamPage = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    loadCsv<TeamCsvRow>('/data/cpc_job_titles.csv')
      .then((rows) => {
        if (!isMounted) return;
        const cleaned = rows
          .map((row) => ({
            Name: (row.employee_name ?? row['\uFEFFemployee_name'])?.trim(),
            Position: row.employee_job_title?.trim(),
            Email: row.employee_email?.trim(),
          }))
          .filter((row) => row.Name || row.Position || row.Email);
        setTeamMembers(cleaned);
      })
      .catch(() => {
        if (!isMounted) return;
        setError('Unable to load team member data.');
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      <div className="pageHeader">
        <h1 className="h1">Team</h1>
        <p className="muted">Meet our team members.</p>
      </div>

      <section className="grid">
        {isLoading && (
          <div className="card teamCard">
            <p className="muted">Loading team members...</p>
          </div>
        )}

        {!isLoading && error && (
          <div className="card teamCard">
            <p className="muted">{error}</p>
          </div>
        )}

        {!isLoading && !error && teamMembers.length === 0 && (
          <div className="card teamCard">
            <p className="muted">No team members found in cpc_job_titles.csv.</p>
          </div>
        )}

        {!isLoading &&
          !error &&
          teamMembers.map((member, index) => (
            <article key={`${member.Name ?? 'member'}-${index}`} className="card teamCard">
              <div className="teamName">{member.Name || 'Unknown Team Member'}</div>
              <div className="teamPosition">{member.Position || 'Position not listed'}</div>
              {member.Email ? (
                <a className="teamEmail" href={`mailto:${member.Email}`}>
                  {member.Email}
                </a>
              ) : (
                <span className="muted">Email not listed</span>
              )}
            </article>
          ))}
      </section>

      <style>{`
        .teamCard {
          border: 1px solid rgba(26, 122, 60, 0.25);
          background: linear-gradient(135deg, rgba(26, 122, 60, 0.08), rgba(40, 168, 82, 0.04));
          min-height: 132px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .teamName {
          font-size: 18px;
          font-weight: 800;
          color: #1a7a3c;
        }

        .teamPosition {
          color: #1a2e1a;
          font-weight: 600;
        }

        .teamEmail {
          color: #1a7a3c;
          text-decoration: none;
          font-weight: 600;
          word-break: break-word;
        }

        .teamEmail:hover {
          color: #28a852;
          text-decoration: underline;
        }
      `}</style>
    </>
  );
};

export default TeamPage;
