import * as THREE from 'three';

export function createCinema(renderer) {
  const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: true });
  target.samples = 4;
  const material = new THREE.ShaderMaterial({
    depthTest: false, depthWrite: false,
    uniforms: { image: { value: target.texture }, resolution: { value: new THREE.Vector2(1, 1) }, grain: { value: .003 } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv; gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: `uniform sampler2D image; uniform vec2 resolution; uniform float grain; varying vec2 vUv;
      float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
      void main(){vec3 col=texture2D(image,vUv).rgb; vec3 glow=vec3(0.); vec2 pixel=1./resolution;
      for(int i=0;i<8;i++){float a=float(i)*.785398; vec2 d=vec2(cos(a),sin(a)); vec3 tap=texture2D(image,vUv+d*pixel*5.).rgb; glow+=max(vec3(0.),tap-vec3(1.25));}
      col+=glow*.0125; float luma=dot(col,vec3(.2126,.7152,.0722));
      col=mix(vec3(luma),col,.94); col*=vec3(1.015,1.,.98); gl_FragColor=vec4(col,1.);
      #include <tonemapping_fragment>
      gl_FragColor.rgb+=(hash(gl_FragCoord.xy)-.5)*grain;
      #include <colorspace_fragment>
      }`,
  });
  const screen = new THREE.Scene();
  screen.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
  const camera = new THREE.Camera();
  renderer.info.autoReset = false;
  return {
    resize() {
      const size = renderer.getDrawingBufferSize(new THREE.Vector2());
      target.setSize(size.x, size.y);
      material.uniforms.resolution.value.copy(size);
    },
    render(scene, viewCamera) {
      renderer.info.reset();
      renderer.setRenderTarget(target);
      renderer.render(scene, viewCamera);
      renderer.setRenderTarget(null);
      renderer.render(screen, camera);
    },
  };
}
