# Third-Party Skill Lisansları ve Atıflar

Bu dosya `.claude/skills/` altındaki üçüncü taraf skill'lerin kaynaklarını ve lisans gereksinimlerini belgeler. Yeni dış skill eklerken bu dosyaya bir bölüm ekleyin.

---

## three-best-practices

**Eser:** Three.js performance optimization and best practices guidelines
**Kaynak:** https://github.com/emalorenzo/three-agent-skills/tree/main/skills/three-best-practices
**Yazar:** emalorenzo ([@emalorenzo](https://github.com/emalorenzo))
**Lisans:** **MIT License**
**Sürüm:** 2.1.0 (Three.js 0.182.0+)
**Eklenme tarihi:** 2026-05-22

### Atıf metni

> Three.js best practices skill includes content from [three-agent-skills](https://github.com/emalorenzo/three-agent-skills) by emalorenzo (MIT License), which compiles official guidelines from the Three.js `llms` branch by [mrdoob](https://github.com/mrdoob) and [100 Three.js Tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips) by [Utsubo](https://www.utsubo.com).

### Kapsam (özet)

- 120+ kural, 18 kategori
- Modern setup, memory disposal, render loop, draw call optimization
- Geometry/material/texture/lighting optimization
- Shader (GLSL + TSL — Three Shading Language)
- WebGPU, WebXR, physics (Rapier, Cannon-es), audio
- Mobile optimization, production, debug

### Lokal yol

`.claude/skills/three-best-practices/` — `SKILL.md` + 28 rules dosyası.

---

## r3f-best-practices

**Eser:** React Three Fiber (R3F) and Poimandres ecosystem best practices
**Kaynak:** https://github.com/emalorenzo/three-agent-skills/tree/main/skills/r3f-best-practices
**Yazar:** emalorenzo
**Lisans:** **MIT License**
**Sürüm:** 1.1.0
**Eklenme tarihi:** 2026-05-22

### Atıf metni

> R3F best practices skill includes content from [three-agent-skills](https://github.com/emalorenzo/three-agent-skills) by emalorenzo (MIT License). Additional tips from [100 Three.js Tips](https://www.utsubo.com/blog/threejs-best-practices-100-tips) by Utsubo.

### Kapsam

- 70+ kural, 12 kategori
- Performance & re-renders (CRITICAL — perf-never-set-state-in-useframe)
- useFrame & animation patterns
- Component patterns, Canvas & setup
- Drei helpers, Suspense loading
- State management (Zustand), events, post-processing, physics (Rapier), Leva

### Lokal yol

`.claude/skills/r3f-best-practices/` — `SKILL.md` + 7 rules dosyası.

---

## MIT License (üst metin — her iki skill için geçerli)

```
MIT License

Copyright (c) 2025 emalorenzo

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Değerlendirilen ancak entegre edilmeyen kaynaklar (2026-05-22 inceleme)

Aşağıdaki repolar incelendi ama entegre edilmedi — sebepleri kayıt için.

| Repo | Sebep |
|---|---|
| [Logos-Liber/Atlas-Agent-Teams](https://github.com/Logos-Liber/Atlas-Agent-Teams) | LICENSE dosyası mevcut değil (404). 3d-design + game-dev team'lerinde faydalı içerik var (asset-optimization, blender, threejs skill'leri) ama belirsiz lisans nedeniyle telif riski. İçerik kategorileri büyük oranda `three-best-practices` ile örtüşüyor. |
| [Andrew1326/dominations](https://github.com/Andrew1326/dominations) | 2D Phaser tabanlı MMORTS prototipi — 3D / R3F / anatomi içeriği yok. |
| [phuetz/code-buddy](https://github.com/phuetz/code-buddy) | Terminal AI agent (15 LLM provider, 190+ slash komut). 3D / medikal odaklı değil; agent orchestration pattern referansı olarak ileride bakılabilir. |
| [Svetlana-DAO-LLC/cad-agent](https://github.com/Svetlana-DAO-LLC/cad-agent) | build123d + VTK CAD render. **Polyform Small Business 1.0.0** lisansı — ticari kullanım için <100 kişi şirket sınırı. Bizim "vision feedback" pattern'imiz (`medisim-3d-vision-test` skill) işlevsel olarak benzer; yeniden entegre etmeye gerek yok. |
| [majiayu000/claude-skill-registry](https://github.com/majiayu000/claude-skill-registry) | Skill discovery/index aracı; kendi skill'i değil. CLI: `sk install <skill>`. Yeni skill ararken kullanım için referans tutulabilir. |
| [Jeffallan/claude-skills](https://github.com/Jeffallan/claude-skills) | 66 skill (backend/frontend/devops/security). 3D veya medikal yok; jenerik web stack. Spesifik bir ihtiyaç çıkarsa tek tek değerlendirilir. |

Tekrar değerlendirme zamanı geldiğinde bu listeyi yenileyin.
