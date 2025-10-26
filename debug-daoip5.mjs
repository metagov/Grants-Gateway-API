async function debugDaoip5() {
  try {
    // Fetch grants_pool.json
    const poolsResponse = await fetch('http://localhost:5000/api/proxy/daoip5/stellar/grants_pool.json');
    const poolsData = await poolsResponse.json();
    
    console.log('=== GRANTS_POOL.JSON STRUCTURE ===');
    console.log('Top-level keys:', Object.keys(poolsData));
    if (poolsData.grantPools && poolsData.grantPools.length > 0) {
      console.log('Number of pools:', poolsData.grantPools.length);
      console.log('First pool structure:', Object.keys(poolsData.grantPools[0]));
      console.log('First pool id:', poolsData.grantPools[0].id);
      console.log('First pool name:', poolsData.grantPools[0].name);
    }
    
    // Fetch an application file
    const appResponse = await fetch('http://localhost:5000/api/proxy/daoip5/stellar/scf_1_applications_uri.json');
    const appData = await appResponse.json();
    
    console.log('\n=== SCF_1_APPLICATIONS_URI.JSON STRUCTURE ===');
    console.log('Top-level keys:', Object.keys(appData));
    
    // Check if applications are nested in grantPools
    if (appData.grantPools && appData.grantPools.length > 0) {
      console.log('Number of grantPools in application file:', appData.grantPools.length);
      console.log('First grantPool keys:', Object.keys(appData.grantPools[0]));
      const firstPool = appData.grantPools[0];
      
      if (firstPool.applications && firstPool.applications.length > 0) {
        console.log('Applications found in grantPools[0].applications');
        console.log('Number of applications:', firstPool.applications.length);
        console.log('First application keys:', Object.keys(firstPool.applications[0]));
        console.log('First application id:', firstPool.applications[0].id);
        console.log('First application projectName:', firstPool.applications[0].projectName);
        console.log('First application status:', firstPool.applications[0].status);
      } else {
        console.log('No applications array found in grantPools[0]');
      }
    } else if (appData.applications && appData.applications.length > 0) {
      console.log('Applications found at top level');
      console.log('Number of applications:', appData.applications.length);
      console.log('First application keys:', Object.keys(appData.applications[0]));
    }
    
    // Check Octant data
    console.log('\n=== CHECKING OCTANT DATA ===');
    const octantResponse = await fetch('http://localhost:5000/api/proxy/opengrants/grantApplications?system=octant');
    if (octantResponse.ok) {
      const octantData = await octantResponse.json();
      console.log('Octant response keys:', Object.keys(octantData));
      if (octantData.grantApplications) {
        console.log('Octant applications count:', octantData.grantApplications.length);
      } else if (octantData.data) {
        console.log('Octant data count:', octantData.data.length);
      } else {
        console.log('No applications found in Octant response');
      }
    } else {
      console.log('Failed to fetch Octant data:', octantResponse.status);
    }
    
    // Check Giveth data
    console.log('\n=== CHECKING GIVETH DATA ===');
    const givethResponse = await fetch('http://localhost:5000/api/proxy/opengrants/grantApplications?system=giveth');
    if (givethResponse.ok) {
      const givethData = await givethResponse.json();
      console.log('Giveth response keys:', Object.keys(givethData));
      if (givethData.grantApplications) {
        console.log('Giveth applications count:', givethData.grantApplications.length);
      } else if (givethData.data) {
        console.log('Giveth data count:', givethData.data.length);
      } else {
        console.log('No applications found in Giveth response');
      }
    } else {
      console.log('Failed to fetch Giveth data:', givethResponse.status);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugDaoip5();