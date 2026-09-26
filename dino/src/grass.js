// Густая трава вокруг игрока: тысячи карточек, которые шейдер «переносит» вслед за камерой
// и ставит на рельеф по карте высот. Плотность берётся из той же карты.
import * as THREE from './three.js';
import { mulberry32 } from './noise.js';
import { grassCard } from './textures.js';

export class GrassField {
  constructor(scene, world, quality) {
    const count = quality === 'high' ? 42000 : 22000;
    this.radius = quality === 'high' ? 60 : 44;
    const base = new THREE.BufferGeometry();
    // две скрещённые карточки 1 x 0.8 м
    const pos = [], uv = [], nor = [], idx = [];
    for (let k = 0; k < 2; k++) {
      const a = k * Math.PI / 2, cx = Math.cos(a) * 0.5, cz = Math.sin(a) * 0.5, o = k * 4;
      pos.push(-cx, 0, -cz, cx, 0, cz, -cx, 0.8, -cz, cx, 0.8, cz);
      uv.push(0, 0, 1, 0, 0, 1, 1, 1);
      nor.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
      idx.push(o, o + 1, o + 2, o + 1, o + 3, o + 2);
    }
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setIndex(idx);
    const off = new Float32Array(count * 3), rand = mulberry32(99), R = this.radius;
    for (let i = 0; i < count; i++) {
      off[i * 3] = (rand() * 2 - 1) * R;
      off[i * 3 + 1] = (rand() * 2 - 1) * R;
      off[i * 3 + 2] = rand();
    }
    geo.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 3));
    geo.instanceCount = count;

    this.u = {
      uCenter: { value: new THREE.Vector3() }, uR: { value: R }, tHeight: { value: world.heightTex },
      uHM: { value: 1000 }, uTime: world.uTime,
    };
    const mat = new THREE.MeshStandardMaterial({
      map: grassCard(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9, envMapIntensity: 0.5,
    });
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, this.u);
      sh.vertexShader = `
        uniform vec3 uCenter; uniform float uR; uniform sampler2D tHeight; uniform float uHM; uniform float uTime;
        attribute vec3 aOff; varying float vShade;
      ` + sh.vertexShader.replace('#include <begin_vertex>', `
        vec2 p = mod(aOff.xy - uCenter.xz + uR, 2.0 * uR) - uR + uCenter.xz;
        vec4 hm = texture2D(tHeight, p / uHM + 0.5);
        float d = length(p - uCenter.xz) / uR;
        float r = fract(aOff.z * 7.13);
        float s = step(aOff.z, hm.g) * (1.0 - smoothstep(0.7, 1.0, d)) * (0.6 + 0.8 * r) * step(1.8, hm.r);
        float ang = aOff.z * 31.4;
        vec3 lp = position;
        lp.xz = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * lp.xz;
        lp *= s;
        lp.y *= 0.8 + 0.5 * fract(aOff.z * 3.7) + max(hm.b, 0.0) * 0.6;
        float sway = sin(uTime * 1.7 + p.x * 0.35 + p.y * 0.27) * 0.13 * lp.y + sin(uTime * 3.1 + p.x) * 0.03 * lp.y;
        lp.x += sway; lp.z += sway * 0.6;
        vec3 transformed = vec3(p.x + lp.x, hm.r + lp.y - 0.04, p.y + lp.z);
        vShade = 0.7 + 0.55 * fract(aOff.z * 13.7);
      `);
      sh.fragmentShader = 'varying float vShade;\n' + sh.fragmentShader.replace('#include <map_fragment>', `
        #include <map_fragment>
        diffuseColor.rgb *= vShade * 1.15;
      `);
    };
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);
  }

  update(center) {
    this.u.uCenter.value.copy(center);
  }
}
