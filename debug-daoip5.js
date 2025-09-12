import fetch from 'node-fetch';

async function debugDaoip5() {
  try {
    // Fetch grants_pool.json
    const poolsResponse = await fetch('http://localhost:5000/api/proxy/daoip5/stellar/grants_pool.json');
    const poolsData = await poolsResponse.json();
    
    console.log('=== GRANTS_POOL.JSON STRUCTURE ===');
    console.log('Top-level keys:', Object.keys(poolsData));
    if (poolsData.grantPools && poolsData.grantPools.length > 0) {
      console.log('First pool structure:', Object.keys(poolsData.grantPools[0]));
      console.log('First pool sample:', JSON.stringify(poolsData.grantPools[0], null, 2).substring(0, 500));
    }
    
    // Fetch an application file
    const appResponse = await fetch('http://localhost:5000/api/proxy/daoip5/stellar/scf_1_applications_uri.json');
    const appData = await appResponse.json();
    
    console.log('\n=== SCF_1_APPLICATIONS_URI.JSON STRUCTURE ===');
    console.log('Top-level keys:', Object.keys(appData));
    
    // Check if applications are nested in grantPools
    if (appData.grantPools && appData.grantPools.length > 0) {
      console.log('First grantPool keys:', Object.keys(appData.grantPools[0]));
      const firstPool = appData.grantPools[0];
      
      if (firstPool.applications && firstPool.applications.length > 0) {
        console.log('Applications found in grantPools[0].applications');
        console.log('First application keys:', Object.keys(firstPool.applications[0]));
        console.log('First application sample:', JSON.stringify(firstPool.applications[0], null, 2).substring(0, 500));
      } else {
        console.log('No applications array found in grantPools[0]');
      }
    } else if (appData.applications && appData.applications.length > 0) {
      console.log('Applications found at top level');
      console.log('First application keys:', Object.keys(appData.applications[0]));
      console.log('First application sample:', JSON.stringify(appData.applications[0], null, 2).substring(0, 500));
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugDaoip5();