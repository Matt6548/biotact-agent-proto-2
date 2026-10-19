import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const FLAME_VERTEX=`
varying vec2 vUv;
uniform float uTime;
uniform float uTilt;
uniform float uInstability;
void main(){
  vUv=uv;
  vec3 p=position;
  float lift=smoothstep(0.0,1.0,uv.y);
  float wave=sin(uv.y*10.0+uTime*7.0)*0.045*uInstability*(0.25+lift);
  p.x+=wave+uTilt*uv.y*0.28;
  p.y+=sin(uTime*4.5+uv.x*5.0)*0.018*uInstability;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
}
`;

const FLAME_FRAGMENT=`
varying vec2 vUv;
uniform float uTime;
uniform float uInstability;
uniform float uAlive;
void main(){
  float y=vUv.y;
  float width=mix(0.46,0.035,pow(y,1.28));
  float dx=abs(vUv.x-0.5);
  float body=1.0-smoothstep(width*0.70,width,dx);
  float bottom=smoothstep(0.0,0.09,y);
  float top=1.0-smoothstep(0.91,1.0,y);
  float edge=body*bottom*top;
  float pulse=0.94+0.06*sin(uTime*9.0+y*13.0+uInstability*4.0);
  float core=1.0-smoothstep(0.0,width*0.48,dx);
  vec3 blue=vec3(0.28,0.48,1.0);
  vec3 amber=vec3(1.0,0.46,0.08);
  vec3 yellow=vec3(1.0,0.91,0.45);
  vec3 color=mix(blue,amber,smoothstep(0.05,0.24,y));
  color=mix(color,yellow,core*smoothstep(0.18,0.58,y));
  float alpha=edge*pulse*uAlive;
  if(alpha<0.01) discard;
  gl_FragColor=vec4(color,alpha);
}
`;

export class CandleRenderer{
  constructor(container,{active=true,pixelRatio=2,interactive=true}={}){
    this.container=container;
    this.clock=new THREE.Clock();
    this.active=false;
    this.raf=null;
    this.pixelRatioCap=pixelRatio;
    this.interactive=interactive;
    this.state={tilt:0,instability:0,stability:1,extinguished:false};
    this.wasExtinguished=false;
    this.smokeLife=0;
    this.airPulseLife=0;
    this.airPulseStrength=0;

    this.scene=new THREE.Scene();
    this.camera=new THREE.PerspectiveCamera(28,1,.1,100);
    this.camera.position.set(3.4,2.7,5.6);

    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:"high-performance"});
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,this.pixelRatioCap));
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.05;
    this.renderer.shadowMap.enabled=true;
    this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute("aria-label","Interactive 3D candle training target");
    container.appendChild(this.renderer.domElement);

    this.controls=new OrbitControls(this.camera,this.renderer.domElement);
    this.controls.enableDamping=this.interactive;
    this.controls.enabled=this.interactive;
    this.controls.enablePan=false;
    this.controls.minDistance=4.3;
    this.controls.maxDistance=7.4;
    this.controls.minPolarAngle=.72;
    this.controls.maxPolarAngle=1.48;
    this.controls.target.set(0,.72,0);

    this.makeScene();
    this.resizeObserver=new ResizeObserver(()=>this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.renderOnce();
    this.setActive(active);
  }

  makeScene(){
    this.scene.add(new THREE.HemisphereLight(0xf3ead0,0x272a25,1.5));

    const key=new THREE.DirectionalLight(0xfff1d5,2.1);
    key.position.set(3,5,4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);
    this.scene.add(key);

    const rim=new THREE.DirectionalLight(0x9ca8c7,.8);
    rim.position.set(-4,2,-3);this.scene.add(rim);

    const floor=new THREE.Mesh(
      new THREE.CircleGeometry(3.5,72),
      new THREE.MeshStandardMaterial({color:0x171814,roughness:.96,metalness:0})
    );
    floor.rotation.x=-Math.PI/2;floor.position.y=-1.12;floor.receiveShadow=true;
    this.scene.add(floor);

    const candleMaterial=new THREE.MeshStandardMaterial({color:0xe5dec8,roughness:.74,metalness:0});
    this.candle=new THREE.Mesh(new THREE.CylinderGeometry(.56,.62,2.15,72,1,false),candleMaterial);
    this.candle.position.y=0;this.candle.castShadow=true;this.candle.receiveShadow=true;
    this.scene.add(this.candle);

    const top=new THREE.Mesh(
      new THREE.CylinderGeometry(.555,.555,.08,72),
      new THREE.MeshStandardMaterial({color:0xf2ead5,roughness:.82})
    );
    top.position.y=1.095;top.castShadow=true;this.scene.add(top);

    this.wick=new THREE.Mesh(
      new THREE.CylinderGeometry(.027,.032,.28,16),
      new THREE.MeshStandardMaterial({color:0x252018,roughness:1})
    );
    this.wick.position.y=1.27;this.scene.add(this.wick);

    this.flameUniforms={uTime:{value:0},uTilt:{value:0},uInstability:{value:0},uAlive:{value:1}};
    const flameMaterial=new THREE.ShaderMaterial({
      vertexShader:FLAME_VERTEX,fragmentShader:FLAME_FRAGMENT,
      uniforms:this.flameUniforms,transparent:true,depthWrite:false,
      blending:THREE.AdditiveBlending,side:THREE.DoubleSide
    });
    this.flamePlane=new THREE.Mesh(new THREE.PlaneGeometry(.72,1.2,18,24),flameMaterial);
    this.flamePlane.position.y=1.86;
    this.flameGroup=new THREE.Group();this.flameGroup.add(this.flamePlane);this.scene.add(this.flameGroup);

    this.flameLight=new THREE.PointLight(0xff9a38,2.7,4.2,2);
    this.flameLight.position.set(0,1.8,.1);this.scene.add(this.flameLight);

    const smokeCount=34;
    const smokePositions=new Float32Array(smokeCount*3);
    this.smokeSeeds=[];
    for(let i=0;i<smokeCount;i++){
      smokePositions[i*3]=0;smokePositions[i*3+1]=1.55;smokePositions[i*3+2]=0;
      this.smokeSeeds.push({phase:i*.73,speed:.65+(i%7)*.055,spread:.08+(i%5)*.018});
    }
    this.smokeGeometry=new THREE.BufferGeometry();
    this.smokeGeometry.setAttribute("position",new THREE.BufferAttribute(smokePositions,3));
    this.smokeMaterial=new THREE.PointsMaterial({color:0xb6b6ad,size:.075,transparent:true,opacity:0,depthWrite:false,sizeAttenuation:true});
    this.smoke=new THREE.Points(this.smokeGeometry,this.smokeMaterial);
    this.scene.add(this.smoke);

    const airCount=54;
    const airPositions=new Float32Array(airCount*3);
    this.airSeeds=[];
    for(let i=0;i<airCount;i++){
      airPositions[i*3]=-3;airPositions[i*3+1]=1.72;airPositions[i*3+2]=0;
      this.airSeeds.push({phase:i*.91,offset:(i/airCount)*.85,vertical:((i%9)-4)*.025,depth:((i%7)-3)*.025});
    }
    this.airGeometry=new THREE.BufferGeometry();
    this.airGeometry.setAttribute("position",new THREE.BufferAttribute(airPositions,3));
    this.airMaterial=new THREE.PointsMaterial({
      color:0xd8ece8,size:.078,transparent:true,opacity:0,depthWrite:false,sizeAttenuation:true,
      blending:THREE.AdditiveBlending
    });
    this.airPulse=new THREE.Points(this.airGeometry,this.airMaterial);
    this.scene.add(this.airPulse);
  }

  setState(next){
    if(!next)return;
    const justExtinguished=Boolean(next.extinguished)&&!this.wasExtinguished;
    this.state={...this.state,...next};
    this.wasExtinguished=Boolean(next.extinguished);
    if(justExtinguished)this.smokeLife=1;
  }

  triggerImpulse(strength=.5){
    this.airPulseStrength=THREE.MathUtils.clamp(Number(strength)||0,.15,1.35);
    this.airPulseLife=1;
  }

  reset(){
    this.state={tilt:0,instability:0,stability:1,extinguished:false};
    this.wasExtinguished=false;this.smokeLife=0;this.airPulseLife=0;
    if(this.airMaterial)this.airMaterial.opacity=0;
  }

  updateSmoke(dt,elapsed){
    if(this.smokeLife<=0){this.smokeMaterial.opacity=0;return;}
    this.smokeLife=Math.max(0,this.smokeLife-dt*.24);
    const progress=1-this.smokeLife;
    const arr=this.smokeGeometry.attributes.position.array;
    for(let i=0;i<this.smokeSeeds.length;i++){
      const s=this.smokeSeeds[i],local=(progress*1.8+i/this.smokeSeeds.length*.55)%1;
      arr[i*3]=Math.sin(elapsed*1.1+s.phase)*s.spread*(.35+local);
      arr[i*3+1]=1.55+local*(.65+s.speed);
      arr[i*3+2]=Math.cos(elapsed*.9+s.phase)*s.spread*.55;
    }
    this.smokeGeometry.attributes.position.needsUpdate=true;
    this.smokeMaterial.opacity=Math.sin(Math.min(1,progress*3)*Math.PI*.5)*this.smokeLife*.44;
  }

  updateAirPulse(dt,elapsed){
    if(this.airPulseLife<=0){this.airMaterial.opacity=0;return;}
    this.airPulseLife=Math.max(0,this.airPulseLife-dt*.95);
    const progress=1-this.airPulseLife;
    const arr=this.airGeometry.attributes.position.array;
    const packetX=-2.7+progress*3.05;
    for(let i=0;i<this.airSeeds.length;i++){
      const s=this.airSeeds[i];
      const tail=s.offset*(.7+.22*this.airPulseStrength);
      arr[i*3]=packetX-tail;
      arr[i*3+1]=1.72+s.vertical+Math.sin(elapsed*12+s.phase)*.035*this.airPulseStrength;
      arr[i*3+2]=s.depth+Math.cos(elapsed*9+s.phase)*.025*this.airPulseStrength;
    }
    this.airGeometry.attributes.position.needsUpdate=true;
    this.airMaterial.opacity=Math.sin(Math.PI*progress)*.52*Math.min(1,this.airPulseStrength);
    this.airMaterial.size=.068+.025*Math.min(1,this.airPulseStrength);
  }

  resize(){
    const width=Math.max(1,this.container.clientWidth),height=Math.max(1,this.container.clientHeight);
    this.camera.aspect=width/height;this.camera.updateProjectionMatrix();
    this.renderer.setSize(width,height,false);
  }

  setActive(active){
    const next=Boolean(active);
    if(next===this.active)return;
    this.active=next;
    if(next){
      this.clock.start();
      this.animate();
    }else{
      if(this.raf)cancelAnimationFrame(this.raf);
      this.raf=null;
      this.renderOnce();
    }
  }

  renderOnce(){
    this.controls.update();
    this.renderer.render(this.scene,this.camera);
  }

  animate=()=>{
    if(!this.active){
      this.raf=null;
      return;
    }
    this.raf=requestAnimationFrame(this.animate);
    const dt=Math.min(this.clock.getDelta(),.05),elapsed=this.clock.elapsedTime;
    this.controls.update();

    const targetTilt=(this.state.tilt||0)*.72;
    this.flameUniforms.uTime.value=elapsed;
    this.flameUniforms.uTilt.value=THREE.MathUtils.lerp(this.flameUniforms.uTilt.value,targetTilt,.12);
    this.flameUniforms.uInstability.value=THREE.MathUtils.lerp(this.flameUniforms.uInstability.value,this.state.instability||0,.1);
    this.flameUniforms.uAlive.value=THREE.MathUtils.lerp(this.flameUniforms.uAlive.value,this.state.extinguished?0:1,this.state.extinguished?.14:.08);

    this.flameGroup.quaternion.copy(this.camera.quaternion);
    this.flamePlane.rotation.z=-targetTilt*.42;

    const alive=1-this.flameUniforms.uAlive.value;
    const flicker=.88+.12*Math.sin(elapsed*15.7)+.06*Math.sin(elapsed*9.2);
    this.flameLight.intensity=this.state.extinguished?Math.max(0,2.2*(1-alive)):2.35*flicker;
    this.flameLight.position.x=Math.sin(elapsed*7.1)*.025*(1+(this.state.instability||0));

    this.updateAirPulse(dt,elapsed);
    this.updateSmoke(dt,elapsed);
    this.renderer.render(this.scene,this.camera);
  }

  dispose(){
    this.active=false;
    if(this.raf)cancelAnimationFrame(this.raf);
    this.raf=null;
    this.resizeObserver.disconnect();this.controls.dispose();
    this.renderer.dispose();this.container.replaceChildren();
  }
}
