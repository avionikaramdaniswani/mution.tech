const check = async () => {
  for(let i=0; i<30; i++) {
    try {
      const testRes = await fetch('https://mution.tech/api/test-metrics');
      const text = await testRes.text();
      console.log('TEST RESULT:', text);
      if (text.includes('dbUuid')) {
        break;
      }
    } catch(e) {}
    await new Promise(r => setTimeout(r, 10000));
  }
}
check();
