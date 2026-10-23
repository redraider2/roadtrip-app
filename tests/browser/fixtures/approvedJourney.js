// Local, isolated visual demo. All application API responses are sample data.
localStorage.setItem('roadtrip_auth', JSON.stringify({token:'local-visual-demo',user:{email:'preview@example.com'}}));
const originalFetch = window.fetch.bind(window);
const points = [[25.76,-80.19],[26.14,-80.21],[27.66,-80.55],[28.44,-81.44],[29.65,-82.35],[30.42,-82.9],[30.44,-84.28],[30.46,-86.63],[30.69,-88.04],[31.33,-89.29],[32.3,-90.18],[32.51,-92.13],[32.52,-93.75],[32.77,-96.8],[32.75,-97.33],[32.45,-99.73],[32.47,-100.4],[33.58,-101.87]];
window.fetch = async (input, options={}) => {
 const url = new URL(typeof input === 'string' ? input : input.url, location.href);
 if (url.hostname === 'nominatim.openstreetmap.org') {
   const start = /Miami/i.test(url.searchParams.get('q'));
   return Response.json([{lat:start?'25.76':'33.58',lon:start?'-80.19':'-101.87',display_name:start?'Miami, FL':'Lubbock, TX'}]);
 }
 if (url.hostname !== 'localhost' || url.port !== '5001') return originalFetch(input,options);
 let data=[];
 const path=url.pathname;
 if(path==='/football/teams') data=[{school:'TCU',color:'#4d1979',logos:[]},{school:'Texas Tech',color:'#cc0000',logos:[]}];
 if(path==='/football/games') data=[{id:'preview-game',awayTeam:'TCU',homeTeam:'Texas Tech',venueId:3784,venue:'Galaxy Stadium',startDate:'2026-11-27T01:00:00Z'}];
 if(path==='/trips') data=[{id:1,title:'TCU @ Texas Tech',start_location:'Miami, FL',end_location:'Galaxy Stadium, Lubbock, TX',venue_id:3784,notes:'Sample trip for layout comparison'}];
 if(path==='/geocode') {const start=/Miami/i.test(url.searchParams.get('q'));data={latitude:start?25.76:33.58,longitude:start?-80.19:-101.87};}
 if(path==='/route') data={geometry:points,distanceMeters:2677933,durationSeconds:87240};
 if(path.endsWith('/places')) data={places:[],venue:{name:'Galaxy Stadium',latitude:33.58,longitude:-101.87,city:'Lubbock',state:'TX'}};
 if(path.endsWith('/featured-partner')) data=null;
 if(path==='/football/along-the-way') data={places:[]};
 if(path.endsWith('/game-day-guide')) data={venueName:'Galaxy Stadium',homeTeam:'Texas Tech'};
 return Response.json(data);
};
