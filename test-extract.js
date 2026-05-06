import axios from 'axios';
async function run() {
  const planesRes = await axios.get('https://web-production-b0130.up.railway.app/plane');
  console.log("type:", typeof planesRes.data);
  console.log("is array?", Array.isArray(planesRes.data));
  console.log("has data?", planesRes.data.data !== undefined);
  console.log("data is array?", Array.isArray(planesRes.data.data));
  const Planes = planesRes.data.data || [];
  console.log("Planes length:", Planes.length);
  if (Planes.length > 0) {
    console.log("Plane 0:", Planes[0]);
    console.log("Plane with cmpg='Mil':", Planes.find(p => p.cmpg === 'Mil'));
    console.log("Plane with cmpg='Gov':", Planes.find(p => p.cmpg === 'Gov'));
  }
}
run();
