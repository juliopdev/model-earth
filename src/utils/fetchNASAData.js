import { formatDateWithHyphen, formatDateWithoutHyphen } from "./formatter";

/**
 * fetchNASAData: Asynchronous function to retrieve weather and solar data from NASA POWER and Open-Meteo APIs.
 * Fetches data for the last 7 days from the specified coordinates.
 * @param {number} lat - Latitude of the location.
 * @param {number} lon - Longitude of the location.
 * @returns {object} - An object containing weather parameters and radiation data.
 */
export async function fetchNASAData(lat, lon) {
  const endDate = new Date();
  const startDate = new Date();
  // Adjust dates to fetch data from 7 days ago up to 3 days ago (NASA delay).
  endDate.setDate(endDate.getDate() - 3); 
  startDate.setDate(startDate.getDate() - 7 - 3);
  
  // NASA POWER API URL for daily parameters (Temp, Humidity, Wind, Solar at Surface)
  const urlParameters = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M,RH2M,WS10M,ALLSKY_SFC_SW_DWN&community=RE&longitude=${lon}&latitude=${lat}&start=${formatDateWithHyphen(startDate)}&end=${formatDateWithHyphen(endDate)}&format=JSON`;
  // Open-Meteo Satellite API for more detailed radiation data.
  const urlRadiations = `https://satellite-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&hourly=shortwave_radiation,direct_radiation,direct_radiation_instant,diffuse_radiation_instant&models=satellite_radiation_seamless&start_date=${formatDateWithoutHyphen(startDate)}&end_date=${formatDateWithoutHyphen(endDate)}`;
  
  try {
    const resParameters = await fetch(urlParameters);
    const resRadiations = await fetch(urlRadiations);
    
    const parameters = await resParameters.json();
    const radiations = resRadiations.ok ? await resRadiations.json() : null;
    console.log({parameters, radiations});
    
    return { parameters, radiations };
  } catch (error) {
    console.error('Error fetching NASA data:', error);
    throw error;
  }
}