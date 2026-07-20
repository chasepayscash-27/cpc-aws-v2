import React from 'react';
import '../App.css';

const ResourcesPage: React.FC = () => {
  const links = [
    { name: "Sell My House Fast In Clay", url: "https://www.chasepayscashforhouses.com/sell-my-house-fast-in-clay/" },
    { name: "Sell My House Fast In Irondale", url: "https://www.chasepayscashforhouses.com/sell-my-house-fast-in-irondale/" },
    { name: "Sell My House Fast In Leeds", url: "https://www.chasepayscashforhouses.com/sell-my-house-fast-in-leeds/" },
    { name: "Sell My House Fast In Moody", url: "https://www.chasepayscashforhouses.com/sell-my-house-fast-in-moody-2/" },
    { name: "Sell My House Fast In Alabaster", url: "https://www.chasepayscashforhouses.com/sell-my-house-fast-in-alabaster-al/" },
    { name: "Sell My House Fast In Calera", url: "https://www.chasepayscashforhouses.com/sell-my-house-fast-in-calera-al/" },
    { name: "Sell My House Fast In Chelsea", url: "https://www.chasepayscashforhouses.com/sell-my-house-fast-in-chelsea-al/" },
    { name: "Sell My House Fast In Gardendale", url: "https://www.chasepayscashforhouses.com/sell-my-house-fast-in-gardendale-al/" },
    { name: "Sell My House Fast In Huntsville", url: "https://www.chasepayscashforhouses.com/sell-my-house-fast-in-huntsville-al/" },
    { name: "Sell My House Fast In Center Point", url: "https://www.chasepayscashforhouses.com/we-buy-houses-center-point/" },
    { name: "Sell My House Fast In East Lake", url: "https://www.chasepayscashforhouses.com/we-buy-houses-east-lake/" },
    { name: "Sell My House Fast In Grayson Valley", url: "https://www.chasepayscashforhouses.com/we-buy-houses-grayson-valley/" },
  ];

  return (
    <>
      <div className="pageHeader">
        <h1 className="h1">Resources</h1>
        <p className="muted">Quick access to our service areas and property listings.</p>
      </div>

      <section className="grid">
        {links.map((link, index) => (
          <a
            key={index}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="resourceLink"
          >
            <div className="card resourceCard">
              <div className="resourceLinkText">{link.name}</div>
              <div className="resourceArrow">→</div>
            </div>
          </a>
        ))}
      </section>

      <style>{`
        .resourceLink {
          text-decoration: none;
          color: inherit;
          display: block;
          transition: all 0.2s ease;
        }

        .resourceLink:hover {
          transform: translateY(-3px);
        }

        .resourceCard {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 18px;
          cursor: pointer;
          border: 1px solid var(--border);
          background: var(--panel2);
          transition: all 0.2s ease;
          min-height: 60px;
        }

        .resourceCard:hover {
          border-color: rgba(63, 185, 80, 0.40);
          background: var(--panel3);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .resourceLinkText {
          font-weight: 500;
          font-size: 14px;
          color: var(--text);
          flex: 1;
        }

        .resourceArrow {
          font-size: 18px;
          color: var(--muted);
          margin-left: 12px;
          transition: all 0.2s ease;
          font-weight: 600;
        }

        .resourceLink:hover .resourceArrow {
          color: var(--accent);
          transform: translateX(4px);
        }
      `}</style>
    </>
  );
};

export default ResourcesPage;
