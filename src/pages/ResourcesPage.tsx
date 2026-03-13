import React from 'react';

const ResourcesPage: React.FC = () => {
  const links = [
     { name: "Sell My House Fast In Clay", url: "https://www.chasepayscashforhouses.com/sell-my-house-fast-in-clay/" },
     { name: "Sell My House Fast In Irondale", url: "https://www.chasepayscashforhouses.com/sell-my-house-fast-in-irondale/" },
     { name: "Sell My House Fast In Leeds", url: " https://www.chasepayscashforhouses.com/sell-my-house-fast-in-leeds/" },
     { name: "Sell My House Fast In Moody", url: "https://www.chasepayscashforhouses.com/sell-my-house-fast-in-moody-2/" },
     { name: "Sell My House Fast In Alabaster", url: "https://www.chasepayscashforhouses.com/sell-my-house-fast-in-alabaster-al/" },
     { name: "Sell My House Fast In Calera", url: "https://www.chasepayscashforhouses.com/sell-my-house-fast-in-calera-al/" },
     { name: "Sell My House Fast In Chelsea", url: "https://www.chasepayscashforhouses.com/sell-my-house-fast-in-chelsea-al/" },
     { name: "Sell My House Fast In Gardendale", url: "https://www.chasepayscashforhouses.com/sell-my-house-fast-in-gardendale-al/" },
     { name: "Sell My House Fast In Huntsville", url: "https://www.chasepayscashforhouses.com/sell-my-house-fast-in-huntsville-al/" },
     { name: "Sell My House Fast In Center Point", url: "https://www.chasepayscashforhouses.com/we-buy-houses-center-point/" },
     { name: "Sell My House Fast In East Lake", url: "https://www.chasepayscashforhouses.com/we-buy-houses-east-lake/" },
     { name: "Sell My House Fast In Grayson Valley", url: "https://www.chasepayscashforhouses.com/we-buy-houses-grayson-valley/" },  
    // Add more links as needed
  ];

  return (
    <div>
      <h1>Resources</h1>
      <ul>
        {links.map((link, index) => (
          <li key={index}>
            <a href={link.url} target="_blank" rel="noopener noreferrer">
              {link.name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ResourcesPage;
