// kit.js — the model lab's materials and ink. ES module, no imports: THREE is passed in, so this file
// can be pasted into a film. The "cel" mode is the film look, copied from films/lantern/index.html:
//   two-tone ShaderMaterial, raw sRGB hex/255 straight to the framebuffer (no colorspace or tonemapping
//   chunk, so a pixel equals the sheet hex), one world-space light, and an ink hull pushed out in clip space.
// "clay" (smooth gray, no ink) judges form; "sil" (flat black, no ink) judges silhouette on white.
// Models only call kit.cel / kit.outline / kit.toon, so they render in any mode unchanged.

export function makeKit(THREE, { mode = "cel", ink = "#101628", light = [0.62, 0.72, 0.3], hullPx = 5 } = {}) {
  if (!["cel", "clay", "sil"].includes(mode)) throw new Error(`kit: mode must be cel, clay or sil (got ${mode})`);

  const LIGHT = new THREE.Vector3(...light).normalize(); // the moon: up, right, a little front
  const resolution = new THREE.Vector2(1920, 1080); // viewport size in pixels, shared by every hull; the lab sets it per cell

  // "#rrggbb", "#rgb" or 0xrrggbb -> 0xrrggbb
  const toInt = (h) => {
    if (typeof h === "number") return h;
    let s = String(h).trim().replace(/^#/, "");
    if (s.length === 3) s = s.replace(/./g, "$&$&");
    if (!/^[0-9a-f]{6}$/i.test(s)) throw new Error(`kit: not a hex color: ${h}`);
    return parseInt(s, 16);
  };
  // Raw sRGB, straight to the framebuffer: pixels equal the sheet hex.
  const rgb = (h) => {
    h = toInt(h);
    return new THREE.Vector3(((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255);
  };

  const TONE_VS = `
    varying vec3 vN;
    void main() {
      vN = transpose(inverse(mat3(modelMatrix))) * normal;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`;
  const TONE_FS = `
    uniform vec3 base, shade, light;
    uniform float threshold;
    varying vec3 vN;
    void main() { gl_FragColor = vec4(dot(normalize(vN), light) > threshold ? base : shade, 1.0); }`;
  // Inverted hull, pushed out a fixed number of pixels in clip space so near and far lines match.
  const HULL_VS = `
    attribute vec3 hullNormal;
    uniform float px;
    uniform vec2 res;
    void main() {
      vec4 c = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      vec2 d = (projectionMatrix * vec4(normalMatrix * hullNormal, 0.0)).xy * res;
      c.xy += d / max(length(d), 1e-4) * (2.0 * px / res) * c.w;
      gl_Position = c;
    }`;
  const HULL_FS = `uniform vec3 ink; void main() { gl_FragColor = vec4(ink, 1.0); }`;
  // Clay: smooth, light gray, lit from the upper right and front of the camera so every view reads.
  const CLAY_VS = `
    varying vec3 vV;
    void main() {
      vV = normalMatrix * normal;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`;
  const CLAY_FS = `
    varying vec3 vV;
    void main() {
      vec3 n = normalize(vV);
      float key = max(dot(n, normalize(vec3(0.45, 0.7, 0.55))), 0.0);
      float fill = max(dot(n, normalize(vec3(-0.8, -0.1, 0.4))), 0.0);
      float sky = 0.5 + 0.5 * n.y;
      float rim = 1.0 - clamp(n.z, 0.0, 1.0);
      float l = 0.36 + 0.46 * key + 0.08 * fill + 0.10 * sky;
      l *= 1.0 - 0.3 * rim * rim;
      gl_FragColor = vec4(vec3(l), 1.0);
    }`;
  // Silhouette: flat black, no ink, no shading.
  const SIL_VS = `void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
  const SIL_FS = `void main() { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0); }`;

  const cache = new Map();
  const memo = (key, make) => cache.get(key) ?? (cache.set(key, make()), cache.get(key));

  /** Two-tone material (cel), smooth gray (clay) or flat black (sil). Cached, so meshes share it. */
  function cel(base, shade, { threshold = 0.35 } = {}) {
    if (mode === "sil") return memo("sil", () => new THREE.ShaderMaterial({ vertexShader: SIL_VS, fragmentShader: SIL_FS }));
    if (mode === "clay") return memo("clay", () => new THREE.ShaderMaterial({ vertexShader: CLAY_VS, fragmentShader: CLAY_FS }));
    const [b, s] = [toInt(base), toInt(shade)];
    return memo(`cel|${b}|${s}|${threshold}`, () =>
      new THREE.ShaderMaterial({
        uniforms: { base: { value: rgb(b) }, shade: { value: rgb(s) }, light: { value: LIGHT }, threshold: { value: threshold } },
        vertexShader: TONE_VS,
        fragmentShader: TONE_FS,
      }));
  }

  /** Boxes and cylinder caps have split normals. Average them per position so the hull closes at corners. */
  function hullNormals(g) {
    if (g.attributes.hullNormal) return g;
    if (!g.attributes.normal) g.computeVertexNormals();
    const p = g.attributes.position;
    const n = g.attributes.normal;
    const [slot, ids, sum] = [new Int32Array(p.count), new Map(), []];
    for (let i = 0; i < p.count; i++) {
      const key = `${Math.round(p.getX(i) * 1e4)},${Math.round(p.getY(i) * 1e4)},${Math.round(p.getZ(i) * 1e4)}`;
      let s = ids.get(key);
      if (s === undefined) (ids.set(key, (s = sum.length / 3)), sum.push(0, 0, 0));
      slot[i] = s;
      sum[s * 3] += n.getX(i);
      sum[s * 3 + 1] += n.getY(i);
      sum[s * 3 + 2] += n.getZ(i);
    }
    const out = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const s = slot[i] * 3;
      const l = Math.hypot(sum[s], sum[s + 1], sum[s + 2]) || 1;
      out.set([sum[s] / l, sum[s + 1] / l, sum[s + 2] / l], i * 3);
    }
    g.setAttribute("hullNormal", new THREE.BufferAttribute(out, 3));
    return g;
  }

  /** Add the inked BackSide hull to a mesh as a child; returns the mesh. Nothing happens in clay or sil. */
  function outline(mesh, { px = hullPx, ink: color = ink } = {}) {
    if (mode !== "cel") return mesh;
    const c = toInt(color);
    const mat = memo(`hull|${c}|${px}`, () =>
      new THREE.ShaderMaterial({
        vertexShader: HULL_VS,
        fragmentShader: HULL_FS,
        side: THREE.BackSide,
        uniforms: { ink: { value: rgb(c) }, px: { value: px }, res: { value: resolution } },
      }));
    const hull = new THREE.Mesh(hullNormals(mesh.geometry), mat);
    hull.name = "hull";
    hull.userData.isHull = true; // the lab leaves hulls out of bbox, triangle counts and reference fits
    mesh.add(hull);
    return mesh;
  }

  /** Mesh + hull. opts: { threshold, px, ink, outline: false } (outline: false for interior lines and glow). */
  function toon(geometry, base, shade, opts = {}) {
    const mesh = new THREE.Mesh(geometry, cel(base, shade, opts));
    return opts.outline === false ? mesh : outline(mesh, opts);
  }

  return { mode, LIGHT, resolution, ink, hullPx, rgb, cel, hullNormals, outline, toon };
}
