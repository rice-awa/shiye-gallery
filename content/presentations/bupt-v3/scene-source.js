/* Build: see README.md. The browser runs the self-contained scene.js bundle. */
import * as THREE from 'three';

(() => {
  const slots = [...document.querySelectorAll('[data-scene]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const toggle = document.querySelector('#spatial-toggle');
  const mint = 0x75c7ba, pale = 0xd5ece5, gold = 0xd6b980;
  let renderer, active, frame = 0, started = 0, elapsed = 2400, previous = 0;
  let enabled = true, held = false, lost = false, renders = 0;
  let tx = 0, ty = 0, rx = 0, ry = 0;
  const cache = new Map();
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const clamp = x => THREE.MathUtils.clamp(x, 0, 1);
  const ease = x => 1 - Math.pow(1 - clamp(x), 3);

  function line(parent, points, color = mint, opacity = .45) {
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({color, transparent:true, opacity, depthWrite:false});
    const object = new THREE.Line(geometry, material);
    parent.add(object);
    return object;
  }
  function node(parent, position, size = .05, color = pale) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 12, 8), new THREE.MeshStandardMaterial({color, roughness:.35, metalness:.25, emissive:color, emissiveIntensity:.2}));
    mesh.position.copy(position); parent.add(mesh); return mesh;
  }
  function curve(parent, points, color = mint, opacity = .8) {
    const path = new THREE.CatmullRomCurve3(points);
    const object = line(parent, path.getPoints(90), color, opacity);
    return {path, object};
  }
  function latLon(lat, lon, radius = 1.5) {
    const a = lat * Math.PI / 180, b = (lon - 95) * Math.PI / 180;
    return V(radius*Math.cos(a)*Math.sin(b), radius*Math.sin(a), radius*Math.cos(a)*Math.cos(b));
  }
  // Deliberately coarse continental outlines: illustrative, never a partner-location map.
  const outlines = [
    [[37,-10],[58,-8],[70,25],[66,60],[74,100],[60,160],[46,146],[36,122],[20,110],[8,105],[22,88],[6,78],[24,67],[12,45],[32,35],[42,28],[37,-10]],
    [[36,-5],[31,30],[10,51],[-10,40],[-35,20],[-24,12],[3,9],[14,-17],[29,-15],[36,-5]],
    [[70,-165],[72,-110],[53,-55],[45,-63],[26,-81],[18,-96],[29,-114],[55,-130],[70,-165]],
    [[10,-81],[8,-55],[-7,-35],[-32,-51],[-55,-69],[-20,-78],[10,-81]],
    [[-12,130],[-12,142],[-24,153],[-38,145],[-35,116],[-22,114],[-12,130]],
  ];
  function globe(parent, radius = 1.5) {
    const earth = new THREE.Group(); parent.add(earth);
    const shell = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 32), new THREE.MeshStandardMaterial({color:0x123f50, roughness:.75, metalness:.2}));
    earth.add(shell);
    for (let lat=-60;lat<=60;lat+=20) line(earth, Array.from({length:97},(_,i)=>latLon(lat,i*360/96,radius*1.004)),mint,.18);
    for (let lon=0;lon<360;lon+=25) line(earth, Array.from({length:65},(_,i)=>latLon(-90+i*180/64,lon,radius*1.004)),mint,.2);
    outlines.forEach(poly => {
      const points=[];
      for(let i=0;i<poly.length-1;i++) for(let k=0;k<6;k++) points.push(latLon(THREE.MathUtils.lerp(poly[i][0],poly[i+1][0],k/6),THREE.MathUtils.lerp(poly[i][1],poly[i+1][1],k/6),radius*1.008));
      line(earth,points,pale,.57);
    });
    return earth;
  }
  function makeScene(kind) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32,1,.1,60);
    camera.position.set(0,0,10);
    scene.add(new THREE.HemisphereLight(0xd3f5e8,0x092438,2.1));
    const key = new THREE.DirectionalLight(0xd3efef,3.1); key.position.set(4,5,6); scene.add(key);
    const rim = new THREE.DirectionalLight(0x63a4b6,2); rim.position.set(-4,0,-2); scene.add(rim);
    const root = new THREE.Group(); scene.add(root);
    const paths = [], pulses = [], pieces = [];
    const addPath = (parent, points, color=mint, delay=0) => {
      const result=curve(parent,points,color); result.delay=delay; paths.push(result);
      const packet=node(parent,points[0],.043,pale); pulses.push({packet,...result}); return result;
    };
    if (kind==='signal' || kind==='globe') {
      const earth = globe(root);
      earth.rotation.z = -.12;
      const origin = latLon(39.9,116.4,1.535);
      node(earth,origin,.072,gold);
      // Endpoints express reach; they do not encode actual exchange partners.
      [[52,0],[20,20],[-26,133],[0,105],[57,151],[40,-100]].forEach(([lat,lon],i)=>{
        const target=latLon(lat,lon,1.535);
        const apex=origin.clone().add(target).normalize().multiplyScalar(2.1+i*.07);
        addPath(earth,[origin,apex,target],i%2?mint:gold,i*.08);
        node(earth,target,.033,mint);
      });
      const ring=Array.from({length:129},(_,i)=>V(2.1*Math.cos(i*Math.PI/64),.06*Math.sin(i*Math.PI/64),2.1*Math.sin(i*Math.PI/64)));
      const orbit=line(root,ring,mint,.24); orbit.rotation.z=.36;
      root.rotation.x=.1;
      camera.position.z=kind==='signal'?9.8:9;
    } else if (kind==='network') {
      [-1,1].forEach((side,groupIndex)=>{
        const cluster = new THREE.Group(); root.add(cluster);
        cluster.position.x=side*1.3; cluster.rotation.set(.4,side*.35,side*.24);
        const nodes=[];
        for(let i=0;i<8;i++) {
          const a=i*Math.PI/4;
          nodes.push(V(Math.cos(a)*.77,Math.sin(a)*.93,Math.sin(a*2)*.42));
          pieces.push(node(cluster,nodes[i],i%2?.07:.09,groupIndex?gold:mint));
        }
        nodes.forEach((p,i)=>{
          line(cluster,[p,nodes[(i+1)%8]],mint,.45);
          if(i<4) line(cluster,[p,nodes[(i+4)%8]],pale,.18);
        });
        node(cluster,V(0,0,0),.17,groupIndex?gold:mint);
        nodes.forEach(p=>line(cluster,[V(0,0,0),p],mint,.2));
      });
      for(let i=0;i<5;i++) {
        const y=(i-2)*.29;
        addPath(root,[V(-1.3,y,.1),V(-.45,y*.4,.7),V(.45,-y*.4,.7),V(1.3,-y,.1)],i%2?gold:mint,i*.09);
      }
      camera.position.z=6.9;
    } else {
      const earth=globe(root,2.5); earth.position.set(0,-3,-1); earth.rotation.z=-.15;
      const satellite=new THREE.Group(); satellite.position.set(.3,.8,.1); satellite.rotation.set(.35,-.35,-.2); root.add(satellite);
      const material=new THREE.MeshStandardMaterial({color:0xc5d8d5,metalness:.65,roughness:.32});
      const core=new THREE.Mesh(new THREE.BoxGeometry(.5,.46,.48),material); satellite.add(core);
      [-1,1].forEach(side=>{
        const panel=new THREE.Mesh(new THREE.BoxGeometry(.82,.04,.62),new THREE.MeshStandardMaterial({color:0x286775,roughness:.45,metalness:.55}));
        panel.position.x=side*.8; satellite.add(panel);
        for(let x=0;x<5;x++) line(satellite,[V(side*(.41+x*.17),.026,-.3),V(side*(.41+x*.17),.026,.3)],mint,.65);
        const arm=new THREE.Mesh(new THREE.BoxGeometry(.3,.045,.045),material); arm.position.x=side*.34; satellite.add(arm);
      });
      const dish=new THREE.Mesh(new THREE.SphereGeometry(.23,16,12,0,Math.PI*2,0,.9),material);
      dish.rotation.x=Math.PI; dish.position.y=-.35; satellite.add(dish);
      const start=V(-1.55,-1.03,.8), end=V(1.62,-1.06,.5);
      node(root,start,.075,gold); node(root,end,.075,gold);
      addPath(root,[start,V(-.8,.1,1),V(.3,.65,.1)],mint,0);
      addPath(root,[V(.3,.65,.1),V(1.1,.1,.8),end],gold,.26);
      line(root,[V(-2.8,.55,-1.7),V(0,1.18,-1.7),V(2.8,.55,-1.7)],mint,.23);
      pieces.push(satellite); camera.position.z=9.8;
    }
    return {scene,camera,root,paths,pulses,pieces,kind,baseX:root.rotation.x};
  }
  function ensureRenderer() {
    if(renderer) return true;
    try {
      const canvas=document.createElement('canvas');
      // Avoid throwing noisy constructor errors when WebGL is unavailable.
      const context=canvas.getContext('webgl2',{alpha:true,antialias:true,powerPreference:'low-power'});
      if(!context) return false;
      renderer=new THREE.WebGLRenderer({canvas,context,alpha:true,antialias:true});
      renderer.setClearColor(0x092438,0);
      renderer.outputColorSpace=THREE.SRGBColorSpace;
      canvas.setAttribute('aria-hidden','true');
      canvas.addEventListener('webglcontextlost',event=>{
        event.preventDefault(); lost=true; stop(); active?.slot.classList.remove('is-rendered');
      });
      canvas.addEventListener('webglcontextrestored',()=>{lost=false;activate(document.querySelector('.slide.active'),true);});
      return true;
    } catch { return false; }
  }
  function resize() {
    if(!active || !renderer || lost) return;
    const rect=active.slot.getBoundingClientRect();
    if(rect.width<1 || rect.height<1) return;
    const dpr=Math.min(devicePixelRatio,1.5);
    renderer.setSize(Math.round(rect.width*dpr),Math.round(rect.height*dpr),false);
    active.camera.aspect=rect.width/rect.height; active.camera.updateProjectionMatrix();
    draw();
  }
  function draw() {
    if(!active || !renderer || !enabled || lost) return;
    const p=reduced.matches?1:clamp(elapsed/2200);
    const turn=ease(p);
    active.root.rotation.y=(1-turn)*-.32+rx;
    active.root.rotation.x=active.baseX+ry;
    const scale=.96+.04*turn; active.root.scale.setScalar(scale);
    active.paths.forEach(({object,delay})=>object.geometry.setDrawRange(0,Math.max(0,Math.floor(clamp((p-delay)/.65)*91))));
    active.pulses.forEach(({packet,path,delay})=>{
      const progress=clamp((p-delay)/.72);
      packet.visible=p<1&&progress>0&&progress<1&&!reduced.matches;
      packet.position.copy(path.getPoint(progress));
    });
    renderer.render(active.scene,active.camera); renders++;
    active.slot.classList.add('is-rendered');
  }
  function stop() { cancelAnimationFrame(frame); frame=0; }
  function tick(now) {
    frame=0;
    if(!active||!enabled||lost||document.hidden||held||document.querySelector('#overview').open) return;
    elapsed=Math.min(2400,now-started);
    const dt=Math.min((now-previous)/1000,.05); previous=now;
    const alpha=1-Math.exp(-12*dt);
    rx+=(tx-rx)*alpha; ry+=(ty-ry)*alpha;
    const moving=Math.abs(tx-rx)+Math.abs(ty-ry)>.0001;
    if(!moving){rx=tx;ry=ty;}
    draw();
    if(elapsed<2400||moving) frame=requestAnimationFrame(tick);
  }
  function wake() {
    if(!frame&&!held&&!document.hidden&&enabled&&!lost&&active&&!document.querySelector('#overview').open){previous=performance.now();frame=requestAnimationFrame(tick);}
  }
  function activate(slide,instant=false) {
    stop(); held=false; tx=ty=rx=ry=0;
    const slot=slide?.querySelector('[data-scene]');
    active?.slot.classList.remove('is-rendered');
    active=null;
    if(!slot||!enabled||!ensureRenderer()) {
      renderer?.domElement.remove();
      if(slot&&enabled){toggle.disabled=true;toggle.title='当前设备显示静态连接示意';toggle.setAttribute('aria-label','三维效果不可用，显示静态示意');}
      return;
    }
    const kind=slot.dataset.scene;
    if(!cache.has(kind)) cache.set(kind,makeScene(kind));
    active={...cache.get(kind),slot}; slot.prepend(renderer.domElement);
    elapsed=instant||reduced.matches?2400:0; started=performance.now()-elapsed;
    resize(); if(elapsed<2400) wake();
  }
  slots.forEach(slot=>{
    slot.addEventListener('pointermove',event=>{
      if(!fine.matches||reduced.matches||held||active?.slot!==slot) return;
      const r=slot.getBoundingClientRect();
      tx=((event.clientX-r.left)/r.width-.5)*.2;
      ty=((event.clientY-r.top)/r.height-.5)*.12;
      wake();
    });
    slot.addEventListener('pointerleave',()=>{tx=ty=0;wake();});
  });
  toggle.addEventListener('click',()=>{
    enabled=!enabled; toggle.setAttribute('aria-pressed',String(enabled));
    toggle.setAttribute('aria-label',enabled?'关闭三维效果':'开启三维效果');
    activate(document.querySelector('.slide.active'),true);
  });
  addEventListener('resize',resize);
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden) stop();
    else {started=performance.now()-elapsed;wake();}
  });
  const overview=document.querySelector('#overview');
  new MutationObserver(()=>{
    if(overview.open) stop();
    else {started=performance.now()-elapsed;wake();}
  }).observe(overview,{attributes:true,attributeFilter:['open']});
  addEventListener('pagehide',event=>{
    stop(); if(event.persisted)return;
    cache.forEach(({scene})=>scene.traverse(object=>{
      object.geometry?.dispose();
      if(object.material) (Array.isArray(object.material)?object.material:[object.material]).forEach(m=>m.dispose());
    }));
    renderer?.dispose();
  });
  addEventListener('pageshow',event=>{if(event.persisted)activate(document.querySelector('.slide.active'),true);});
  window.__spatial={
    activate,
    hold(ms){stop();held=true;elapsed=Math.max(0,ms);draw();},
    state:()=>({enabled,available:!!renderer&&!lost,scene:active?.kind??null,running:!!frame,held,elapsed,renders,drawCalls:renderer?.info.render.calls??0,triangles:renderer?.info.render.triangles??0,geometries:renderer?.info.memory.geometries??0,revision:THREE.REVISION}),
  };
})();
