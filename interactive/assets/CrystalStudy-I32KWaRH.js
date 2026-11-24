const M=`#version 300 es
in vec2 position;
out vec2 uv;
void main(){uv=position;gl_Position=vec4(position,0.,1.);}`,P=`#version 300 es
precision highp float;
in vec2 uv;
out vec4 outputColor;
uniform vec2 resolution;
uniform vec2 orbit;
uniform float distanceToEye;
uniform float lightAngle;
uniform float dispersion;
uniform int singleCrystal;
const float PI=3.14159265359;
vec3 originFor(int id){if(id==1)return vec3(-.85,0.,.32);if(id==2)return vec3(.70,0.,.43);return vec3(0.);}
float heightFor(int id){return id==0?3.1:(id==1?1.75:1.25);}
float radiusFor(int id){return id==0?.62:(id==1?.43:.34);}
mat3 transformFor(int id){float a=id==0?.16:(id==1?-.28:.38);float b=float(id)*.61;
 mat3 tilt=mat3(cos(a),sin(a),0.,-sin(a),cos(a),0.,0.,0.,1.);
 mat3 yaw=mat3(cos(b),0.,-sin(b),0.,1.,0.,sin(b),0.,cos(b));return yaw*tilt;}
bool intervalFor(vec3 ro,vec3 rd,int id,out float entry,out float exit,out vec3 entryN,out vec3 exitN){
 mat3 rotation=transformFor(id);vec3 o=transpose(rotation)*(ro-originFor(id)),d=transpose(rotation)*rd;
 float h=heightFor(id),r=radiusFor(id);entry=-1e5;exit=1e5;entryN=vec3(0.);exitN=vec3(0.);
 for(int i=0;i<13;i++){
  vec3 n;float bound;
  if(i==12){n=vec3(0.,-1.,0.);bound=0.;}
  else{float angle=float(i%6)*PI/3.;n=vec3(cos(angle),i<6?0.:.82,sin(angle));bound=i<6?r:.82*h;}
  float denom=dot(n,d),dist=bound-dot(n,o);
  if(abs(denom)<1e-6){if(dist<0.)return false;continue;}
  float t=dist/denom;
  if(denom<0.){if(t>entry){entry=t;entryN=rotation*normalize(n);}}
  else{if(t<exit){exit=t;exitN=rotation*normalize(n);}}
  if(entry>exit)return false;
 }return exit>max(entry,.0001);
}
vec3 environment(vec3 o,vec3 d){
 vec3 col=mix(vec3(.48,.53,.63),vec3(.94,.91,.86),smoothstep(-.2,.55,d.y));
 // Dark studio cards supply the contrast needed to read clear facets.
 float card=1.-smoothstep(.12,.16,abs(d.x+.55));
 card*=smoothstep(-.2,.05,d.y)*(1.-smoothstep(.65,.85,d.y));
 col=mix(col,vec3(.11,.14,.21),card*.83);
 float cool=pow(max(0.,dot(d,normalize(vec3(.8,.6,.35)))),48.);
 col+=vec3(.48,.68,1.)*cool*2.;
 vec3 sun=normalize(vec3(cos(lightAngle),.85,sin(lightAngle)));
 col+=vec3(1.,.79,.5)*pow(max(0.,dot(d,sun)),180.)*7.;
 float strip=pow(max(0.,dot(d,normalize(vec3(-.5,.5,-.8)))),24.);
 col+=vec3(1.,.88,.77)*strip*1.4;
 if(d.y<-.0001){
  float t=-o.y/d.y;if(t>0.){vec3 p=o+d*t;
   col=mix(vec3(.81,.78,.73),vec3(.94,.91,.86),1.-exp(-length(p.xz)*.09));
   float line=1.-smoothstep(.025,.055,abs(fract((p.z+p.x*.18)*.48)-.5));
   col*=1.-line*.15;
   float shadow=exp(-dot(p.xz,p.xz)*.65)*.25;
   col*=1.-shadow;
  }
 }return col;
}
float fresnel(float cosI,float eta){float f=(eta-1.)/(eta+1.);f*=f;return f+(1.-f)*pow(1.-clamp(cosI,0.,1.),5.);}
float throughChannel(vec3 p,vec3 incoming,vec3 normal,int id,float eta,int channel){
 vec3 rd=refract(incoming,normal,1./eta),ro=p+rd*.002;
 float throughput=1.,result=0.;
 for(int bounce=0;bounce<5;bounce++){
  float en,ex;vec3 nn,nx;
  if(!intervalFor(ro,rd,id,en,ex,nn,nx))break;
  vec3 hit=ro+rd*ex;
  throughput*=exp(-ex*.035);
  vec3 escaped=refract(rd,-nx,eta);
  if(dot(escaped,escaped)>.00001){
   float f=fresnel(dot(rd,nx),eta);
   vec3 outside=environment(hit+escaped*.002,escaped);
   result+=throughput*(1.-f)*outside[channel];throughput*=f;
  }
  rd=reflect(rd,nx);ro=hit+rd*.002;
 }
 return result;
}
void main(){
 vec2 screen=uv;screen.x*=resolution.x/resolution.y;
 vec3 target=vec3(0.,1.35,0.);
 vec3 eye=target+distanceToEye*vec3(cos(orbit.y)*sin(orbit.x),sin(orbit.y),cos(orbit.y)*cos(orbit.x));
 vec3 forward=normalize(target-eye),right=normalize(cross(forward,vec3(0.,1.,0.))),up=cross(right,forward);
 vec3 ray=normalize(forward*2.4+screen.x*right+screen.y*up);
 float nearest=1e5;vec3 normal;int objectId=-1;
 for(int id=0;id<3;id++){
  if(singleCrystal==1&&id>0)continue;
  float en,ex;vec3 nn,nx;
  if(intervalFor(eye,ray,id,en,ex,nn,nx)&&en>0.&&en<nearest){nearest=en;normal=nn;objectId=id;}
 }
 vec3 color=environment(eye,ray);
 if(objectId>=0){
  vec3 p=eye+ray*nearest;
  vec3 reflected=environment(p+normal*.002,reflect(ray,normal));
  vec3 transmitted;
  for(int ch=0;ch<3;ch++){
   float eta=1.544+(float(ch)-1.)*.016*dispersion;
   transmitted[ch]=throughChannel(p,ray,normal,objectId,eta,ch);
  }
  float f=fresnel(dot(-ray,normal),1.544);
  color=mix(transmitted,reflected,f);
 }
 color=1.-exp(-color*1.15);
 color=pow(max(color,vec3(0.)),vec3(1./2.2));
 outputColor=vec4(color,1.);
}`;function T(n){n.innerHTML=`<main class="quartz-study"><canvas aria-label="可旋转缩放的实时三维水晶"></canvas>
 <header><small>REALTIME CRYSTAL / 01</small><h1>水晶 · 光学样例</h1><p>拖动旋转，滚轮缩放，观察折面内的光路变化。</p></header>
 <div class="quartz-tools"><button data-cluster aria-pressed="true">晶簇</button><button data-single aria-pressed="false">单颗水晶</button><label>光线方向<input data-light type="range" min="-180" max="180" value="-45"></label><label>色散<input data-dispersion type="range" min="0" max="2" step="0.05" value="1"></label><button data-reset>复位视角</button></div>
 <footer><span>实时折射 · 内反射 · 光谱色散<br>独立视觉样例，不使用麦克风</span><a href="/">返回原交互 ↗</a></footer><p role="alert" class="quartz-error" hidden></p></main>`;const r=n.querySelector("canvas"),e=r.getContext("webgl2",{antialias:!1,alpha:!1}),v=t=>{const u=n.querySelector("[role=alert]");u.hidden=!1,u.textContent=t};if(!e){v("需要支持 WebGL2 的浏览器，请开启硬件加速后重试。");return}function x(t,u){const c=e.createShader(t);if(e.shaderSource(c,u),e.compileShader(c),!e.getShaderParameter(c,e.COMPILE_STATUS)){const z=e.getShaderInfoLog(c);throw e.deleteShader(c),new Error(z)}return c}let o,h,m;try{if(h=x(e.VERTEX_SHADER,M),m=x(e.FRAGMENT_SHADER,P),o=e.createProgram(),e.attachShader(o,h),e.attachShader(o,m),e.linkProgram(o),!e.getProgramParameter(o,e.LINK_STATUS))throw new Error(e.getProgramInfoLog(o))}catch(t){v("实时水晶初始化失败："+t.message);return}e.useProgram(o);const y=e.createBuffer();e.bindBuffer(e.ARRAY_BUFFER,y),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),e.STATIC_DRAW);const b=e.getAttribLocation(o,"position");e.enableVertexAttribArray(b),e.vertexAttribPointer(b,2,e.FLOAT,!1,0,0);const l=Object.fromEntries(["resolution","orbit","distanceToEye","lightAngle","dispersion","singleCrystal"].map(t=>[t,e.getUniformLocation(o,t)]));let p=.4,s=.22,d=7,w=-Math.PI/4,S=1,E=0,a=null,f=0;function I(){f=0,e.viewport(0,0,r.width,r.height),e.uniform2f(l.resolution,r.width,r.height),e.uniform2f(l.orbit,p,s),e.uniform1f(l.distanceToEye,d),e.uniform1f(l.lightAngle,w),e.uniform1f(l.dispersion,S),e.uniform1i(l.singleCrystal,E),e.drawArrays(e.TRIANGLES,0,3)}const i=()=>{f||(f=requestAnimationFrame(I))},A=()=>{const t=Math.min(window.devicePixelRatio||1,1.5,1500/Math.max(1,r.clientWidth));r.width=Math.max(1,Math.round(r.clientWidth*t)),r.height=Math.max(1,Math.round(r.clientHeight*t)),i()},L=new ResizeObserver(A);L.observe(r),A(),r.addEventListener("pointerdown",t=>{a={id:t.pointerId,x:t.clientX,y:t.clientY},r.setPointerCapture(t.pointerId)}),r.addEventListener("pointermove",t=>{!a||a.id!==t.pointerId||(p-=(t.clientX-a.x)*.008,s=Math.max(-.12,Math.min(1.2,s+(t.clientY-a.y)*.006)),a.x=t.clientX,a.y=t.clientY,i())});const g=()=>{a=null};r.addEventListener("pointerup",g),r.addEventListener("pointercancel",g),r.addEventListener("lostpointercapture",g),r.addEventListener("wheel",t=>{t.preventDefault(),d=Math.max(4.2,Math.min(12,d*Math.exp(t.deltaY*.001))),i()},{passive:!1}),r.addEventListener("webglcontextlost",t=>{t.preventDefault(),v("图形上下文已丢失，请刷新页面。")}),n.querySelector("[data-light]").addEventListener("input",t=>{w=Number(t.target.value)*Math.PI/180,i()}),n.querySelector("[data-dispersion]").addEventListener("input",t=>{S=Number(t.target.value),i()});const F=t=>{E=t,n.querySelector("[data-single]").setAttribute("aria-pressed",String(t===1)),n.querySelector("[data-cluster]").setAttribute("aria-pressed",String(t===0)),i()};n.querySelector("[data-single]").addEventListener("click",()=>F(1)),n.querySelector("[data-cluster]").addEventListener("click",()=>F(0)),n.querySelector("[data-reset]").addEventListener("click",()=>{p=.4,s=.22,d=7,i()}),window.addEventListener("pagehide",()=>{L.disconnect(),cancelAnimationFrame(f),e.deleteBuffer(y),e.deleteProgram(o),e.deleteShader(h),e.deleteShader(m)},{once:!0})}export{T as mountCrystalStudy};
