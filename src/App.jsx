import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  Buildings,
  MapPin,
  Train,
  X,
  List,
} from "@phosphor-icons/react";

const MATERIAL = "/assets/ppt";
const DEPLOY_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const BOOKING_FORM_URL = "https://cjp20zxantfi.jp.larksuite.com/share/base/form/shrjpEO9BfNS4pGvFnoZALkEJyc";

function asset(path) {
  return globalThis.__OFFLINE_ASSETS__?.[path] ?? `${DEPLOY_BASE}${path}`;
}

const navLinks = [
  ["品牌", "heritage"],
  ["项目", "project"],
  ["区位", "location"],
  ["生活", "lifestyle"],
  ["影像", "film"],
  ["户型", "homes"],
  ["联系", "contact"],
];

const lifestyleScenes = [
  {
    no: "01",
    title: "山水环抱",
    en: "LANDSCAPE",
    copy: "葱郁山景与清澈河道温柔相拥，城市繁华与自然静谧在此交融。",
    image: "river-view.jpeg",
  },
  {
    no: "02",
    title: "临水而居",
    en: "RIVERSIDE",
    copy: "与石塘公园隔河相望，坐享滨河绿道景观，让生活回到水岸的从容尺度。",
    image: "river-walk.jpeg",
  },
  {
    no: "03",
    title: "俯瞰一城",
    en: "PANORAMA",
    copy: "板块制高点，俯瞰山水公园与江南流水，云端栖居，繁华静谧尽揽怀中。",
    image: "city-view.png",
  },
  {
    no: "04",
    title: "温馨满屋",
    en: "INTERIOR",
    copy: "港式怀旧风小户型，温馨居家设计，方寸之间尽享烟火温情与精致生活。",
    image: "interior.jpeg",
  },
];

const unitTypes = [
  {
    code: "A1",
    name: "拾光",
    area: "65",
    room: "一室两厅一卫",
    image: "unit-a1.jpg",
    features: ["通透格局", "客餐一体", "独立角厨", "飘窗主卧"],
  },
  {
    code: "A2",
    name: "拾屿",
    area: "67",
    room: "两室两厅一卫",
    image: "unit-a2.jpg",
    features: ["全明空间", "科学布局", "阔绰通厅", "南向主卧"],
  },
  {
    code: "D5",
    name: "澜岸",
    area: "88",
    room: "三室两厅一卫",
    image: "unit-d5.jpg",
    features: ["规整格局", "一体通厅", "飘景主卧", "独立明厨"],
  },
  {
    code: "F2",
    name: "澜轩",
    area: "138",
    room: "三室两厅两卫",
    image: "unit-f2.jpg",
    features: ["独立玄关", "全能三房", "观景阔厅", "南北双阳台"],
  },
];

function Reveal({ children, className = "", delay = 0 }) {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        element.classList.add("is-visible");
        observer.disconnect();
      }
    }, { threshold: 0.12 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref} className={`reveal ${className}`} style={{ "--delay": `${delay}ms` }}>{children}</div>;
}

function Brand({ light = false }) {
  return (
    <a className={`brand ${light ? "is-light" : ""}`} href="#top" aria-label="卓能河畔轩首页">
      <span className="brand-mark" aria-hidden="true" />
      <span><strong>卓能·河畔轩</strong><small>CHEUK NANG RIVERSIDE</small></span>
    </a>
  );
}

function Header({ solid, open, setOpen }) {
  return (
    <header className={`site-header ${solid || open ? "is-solid" : ""}`}>
      <Brand light={!solid && !open} />
      <nav aria-label="主导航">
        {navLinks.map(([label, id]) => <a href={`#${id}`} key={id}>{label}</a>)}
      </nav>
      <a className="header-call" href="tel:057186309988"><span>品鉴热线</span><strong>0571 8630 9988</strong></a>
      <button className="menu-toggle" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={open ? "关闭导航" : "打开导航"} data-testid="mobile-menu-button">
        {open ? <X size={25} /> : <List size={27} />}
      </button>
      <div className={`mobile-menu ${open ? "is-open" : ""}`}>
        <p>CHEUK NANG RIVERSIDE</p>
        {navLinks.map(([label, id], index) => (
          <a href={`#${id}`} key={id} onClick={() => setOpen(false)}>
            <span>{String(index + 1).padStart(2, "0")}</span><strong>{label}</strong><ArrowRight size={20} />
          </a>
        ))}
        <a href={BOOKING_FORM_URL} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>
          <span>08</span><strong>预约参观</strong><ArrowRight size={20} />
        </a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero" id="top">
      <img className="hero-image" src={asset(`${MATERIAL}/river-view.jpeg`)} alt="卓能河畔轩水岸实景" fetchPriority="high" />
      <div className="hero-veil" />
      <div className="hero-line hero-line-a" /><div className="hero-line hero-line-b" />
      <div className="hero-copy">
        <p className="hero-kicker">卓能集团 · 首献杭州</p>
        <h1><span>卓能</span><em>·</em><span>河畔轩</span></h1>
        <div className="hero-rule" />
        <h2>轻享杭州的丰盛生活</h2>
        <p className="hero-meta">临平崇贤 · 地铁口 · 公园旁 · 建面约65-138㎡百万级实景现房</p>
      </div>
      <a className="hero-scroll" href="#heritage"><span>SCROLL</span><ArrowDown size={17} /></a>
      <div className="hero-side-word" aria-hidden="true">RIVERSIDE</div>
    </section>
  );
}

function SectionTitle({ index, en, title, intro, light = false }) {
  return (
    <div className={`section-title ${light ? "is-light" : ""}`}>
      <p><span>{index}</span>{en}</p>
      <h2>{title}</h2>
      {intro && <div>{intro}</div>}
    </div>
  );
}

function Heritage() {
  return (
    <section className="heritage" id="heritage">
      <img className="heritage-bg" src={asset(`${MATERIAL}/group-estate.jpeg`)} alt="卓能集团香港物业实景" />
      <div className="heritage-shade" />
      <div className="shell heritage-inner">
        <Reveal>
          <SectionTitle index="01" en="GROUP HERITAGE" title="实力港企 卓能集团首献杭州" light />
          <p className="heritage-copy">卓能集团拥有逾60载深厚企业底蕴。1973年，集团商务体系于香港有限公司成立；从香港到内地，始终秉承“慎思力先”的理念。</p>
        </Reveal>
        <div className="heritage-stats">
          {[['60+','载企业底蕴'],['1973','港交所上市'],['3','大市场布局']].map(([value, label], index) => (
            <Reveal className="heritage-stat" delay={index * 90} key={label}><strong>{value}</strong><span>{label}</span></Reveal>
          ))}
        </div>
      </div>
      <span className="chapter-sign">Cheuk Nang Group</span>
    </section>
  );
}

function Project() {
  return (
    <section className="project paper" id="project">
      <div className="shell project-grid">
        <Reveal className="project-copy">
          <SectionTitle index="02" en="PROJECT OVERVIEW" title="千亿大城北 崇贤新城乘势而上" />
          <h3>你在杭州的第一个家</h3>
          <p>项目位于杭州临平区崇贤板块核心，踞守绕城内稀缺价格洼地。地铁、商业、教育、医疗与山水生态环伺，以主城级配套和亲民门槛，打造品质生活新标杆。</p>
          <dl>
            <div><dt>12.3<small>万㎡</small></dt><dd>项目总建筑面积</dd></div>
            <div><dt>779<small>个</small></dt><dd>规划车位</dd></div>
            <div><dt>5<small>#</small></dt><dd>盛景弯邸 首开在即</dd></div>
          </dl>
          <a className="text-link" href="#film">观看项目影片 <ArrowRight size={18} /></a>
        </Reveal>
        <Reveal className="project-visual" delay={120}>
          <figure className="project-main"><img src={asset(`${MATERIAL}/community-aerial.jpg`)} alt="卓能河畔轩社区航拍实景" /><figcaption>项目航拍实景</figcaption></figure>
          <figure className="project-inset"><img src={asset(`${MATERIAL}/facade.jpg`)} alt="卓能河畔轩建筑实景" /></figure>
          <span className="project-ring" aria-hidden="true" />
        </Reveal>
      </div>
    </section>
  );
}

function HangzhouChapter() {
  return (
    <section className="chapter-hangzhou">
      <img src={asset(`${MATERIAL}/hangzhou-city-clean.jpg`)} alt="杭州城市与水系航拍" />
      <div className="chapter-overlay" />
      <Reveal className="chapter-copy">
        <p>PART.2 · ENJOY HANGZHOU</p>
        <h2>纵享<span>杭州</span>丰盈</h2>
        <strong>大城丰盈 · 尽享暮景<br />千亿大城北，崇贤新城乘势而上</strong>
      </Reveal>
    </section>
  );
}

function Location() {
  return (
    <section className="location paper" id="location">
      <div className="shell">
        <SectionTitle index="03" en="LOCATION & CONNECTION" title="多维路网 通达全城" intro="邻立拱墅，全维配套触手可及；一城繁华与自然资源，在日常半径内从容抵达。" />
        <div className="location-grid">
          <Reveal className="map-frame"><img src={asset(`${MATERIAL}/location-map.jpg`)} alt="卓能河畔轩区位与城市配套图" /></Reveal>
          <div className="location-facts">
            <Reveal className="location-fact">
              <Train size={27} weight="thin" /><span>约400m直线距离</span><h3>地铁15号线站口</h3><p>约30分钟直达杭州东，串联运河新城、钱江新城与钱江世纪城。</p>
            </Reveal>
            <Reveal className="location-fact" delay={80}>
              <Buildings size={27} weight="thin" /><span>约700m直线距离</span><h3>秋石高架</h3><p>快速路便捷通达全城，衔接主城繁华生活圈。</p>
            </Reveal>
            <Reveal className="location-fact" delay={160}>
              <MapPin size={27} weight="thin" /><span>商业就在家门口</span><h3>约24万方花园城</h3><p>项目1.5km范围内，招商花园城、上亿广场等大型综合体举步可达。</p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

function Lifestyle({ active, setActive }) {
  const scene = lifestyleScenes[active];
  return (
    <section className="lifestyle" id="lifestyle">
      <img key={scene.image} className="lifestyle-bg" src={asset(`${MATERIAL}/${scene.image}`)} alt={scene.title} />
      <div className="lifestyle-shade" />
      <div className="lifestyle-head"><span>04</span><p>LIFESTYLE</p><h2>全维配套 品质生活</h2></div>
      <div className="lifestyle-content">
        <p>{scene.en}</p><h3>{scene.title}</h3><strong>{scene.copy}</strong>
      </div>
      <div className="scene-tabs">
        {lifestyleScenes.map((item, index) => (
          <button className={index === active ? "is-active" : ""} type="button" onMouseEnter={() => setActive(index)} onFocus={() => setActive(index)} onClick={() => setActive(index)} key={item.no}>
            <span>{item.no}</span><strong>{item.title}</strong><i />
          </button>
        ))}
      </div>
    </section>
  );
}

function Film() {
  return (
    <section className="film" id="film">
      <div className="film-title shell">
        <SectionTitle index="05" en="PROJECT FILM" title="造代升级 静候新生代" intro="实景现房，一所见所得；全面升级，一立面景观焕新；品质可靠，一港企标准保障。" light />
      </div>
      <Reveal className="film-frame">
        <video controls playsInline preload="metadata" poster={asset(`${MATERIAL}/interior-panorama.jpg`)}>
          <source src={asset(`${MATERIAL}/project-film.mp4`)} type="video/mp4" />
        </video>
        <span>CHEUK NANG RIVERSIDE · PROJECT FILM</span>
      </Reveal>
    </section>
  );
}

function Homes({ active, setActive }) {
  const unit = unitTypes[active];
  return (
    <section className="homes paper" id="homes">
      <div className="shell">
        <SectionTitle index="06" en="HOME COLLECTION" title="全能户型 尽享“满配”人生" intro="5#盛景弯邸，建面约65-138㎡全能户型，以紧凑尺度承载丰盛生活。" />
        <div className="home-tabs" role="tablist" aria-label="户型选择">
          {unitTypes.map((item, index) => (
            <button type="button" role="tab" aria-selected={index === active} className={index === active ? "is-active" : ""} onClick={() => setActive(index)} key={item.code}>
              <span>{item.code}</span><strong>{item.name}</strong><em>约{item.area}㎡</em>
            </button>
          ))}
        </div>
        <div className="home-detail">
          <Reveal className="home-copy" key={`${unit.code}-copy`}>
            <p>{unit.code} · {unit.name}</p><h3>约 <strong>{unit.area}</strong><small>㎡</small></h3><h4>{unit.room}</h4>
            <ul>{unit.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
            <a className="text-link" href="#contact">预约品鉴 <ArrowRight size={18} /></a>
          </Reveal>
          <Reveal className="home-plan" key={`${unit.code}-plan`} delay={90}><img src={asset(`${MATERIAL}/${unit.image}`)} alt={`${unit.code}${unit.name}约${unit.area}平方米户型图`} /></Reveal>
        </div>
      </div>
    </section>
  );
}

function Benefits() {
  const items = [
    ["65㎡起", "绕城内难得百万级友好门槛"],
    ["租房不如买房", "关注年轻新一代"],
    ["入住即享丰盈", "邻立拱墅 地铁口旁"],
  ];
  return (
    <section className="benefits">
      <div className="shell benefits-inner">
        <Reveal><p>THREE VALUE PROPOSITIONS</p><h2>三大利 诚意首开</h2><span>轻享杭州的丰盛生活</span></Reveal>
        <div className="benefit-grid">{items.map(([value, title], index) => <Reveal className="benefit" delay={index * 90} key={title}><span>0{index + 1}</span><p>{title}</p><strong>{value}</strong></Reveal>)}</div>
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section className="contact" id="contact">
      <img src={asset(`${MATERIAL}/contact-clean.jpg`)} alt="杭州城市天际线" />
      <div className="contact-shade" />
      <div className="shell contact-inner">
        <Reveal>
          <p>CHEUK NANG GROUP · HANGZHOU</p>
          <h2>卓能集团 · 首献杭州</h2>
          <span>临平崇贤 · 地铁口 · 公园旁 · 建面约65-138㎡百万级实景现房</span>
        </Reveal>
        <Reveal className="contact-actions" delay={100}>
          <p>品鉴热线</p><a className="phone-link" href="tel:057186309988">0571 <strong>86309988</strong></a>
          <span><MapPin size={17} />卓能河畔轩销售中心</span>
          <a className="contact-booking" href={BOOKING_FORM_URL} target="_blank" rel="noreferrer">
            <span>预约参观</span><ArrowRight size={18} />
          </a>
        </Reveal>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer><div className="shell footer-inner"><Brand light /><span>CHEUK NANG RIVERSIDE © 2026</span></div></footer>
  );
}

export function App() {
  const [solid, setSolid] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scene, setScene] = useState(0);
  const [unit, setUnit] = useState(0);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = window.scrollY;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        document.documentElement.style.setProperty("--scroll-y", `${Math.min(y, window.innerHeight)}px`);
        document.documentElement.style.setProperty("--page-progress", `${max > 0 ? (y / max) * 100 : 0}%`);
        setSolid(y > 36);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", onScroll); };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setScene((value) => (value + 1) % lifestyleScenes.length), 6200);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("menu-lock", menuOpen);
    return () => document.body.classList.remove("menu-lock");
  }, [menuOpen]);

  return (
    <>
      <div className="intro-screen" aria-hidden="true"><span /><p>CHEUK NANG RIVERSIDE</p><i /></div>
      <div className="page-progress" aria-hidden="true" />
      <Header solid={solid} open={menuOpen} setOpen={setMenuOpen} />
      <a className="booking-float" href={BOOKING_FORM_URL} target="_blank" rel="noreferrer">
        <small>PRIVATE VIEWING</small><span>预约参观</span><ArrowRight size={17} />
      </a>
      <main>
        <Hero />
        <Heritage />
        <Project />
        <HangzhouChapter />
        <Location />
        <Lifestyle active={scene} setActive={setScene} />
        <Film />
        <Homes active={unit} setActive={setUnit} />
        <Benefits />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
