// const fetch = require('node-fetch');
// import fetch from 'node-fetch';


export async function getCoordinates(locationName) {
    const fetch = (await import('node-fetch')).default;
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}`;

  const response = await fetch(url, {
    headers: { 'User-Agent': 'Doctor-CRM-App' }
  });

  const data = await response.json();

  if (data && data.length > 0) {
    return {
      longitude: parseFloat(data[0].lon),   
      latitude: parseFloat(data[0].lat)
    };
  } else {
    throw new Error('Location not found');
  }
}

// module.exports = { getCoordinates };
