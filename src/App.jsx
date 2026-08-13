import { useCallback, useEffect, useRef, useState } from "react";
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
const PROJECT_FILM_URL = `https://media.cheuknangriverside.com${MATERIAL}/project-film.mp4`;
const DEPLOY_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const RESERVATION_ENDPOINT = "/api/reservations";
const ADMIN_ENDPOINT = "/api/admin/reservations";
const PHONE_PATTERN = /^(?:\+?86[- ]?)?1[3-9]\d{9}$/;

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
    image: "unit-a1-logo.jpg",
    features: ["通透格局", "客餐一体", "独立角厨", "飘窗主卧"],
  },
  {
    code: "A2",
    name: "拾屿",
    area: "67",
    room: "两室两厅一卫",
    image: "unit-a2-logo.jpg",
    features: ["全明空间", "科学布局", "阔绰通厅", "南向主卧"],
  },
  {
    code: "D5",
    name: "澜岸",
    area: "88",
    room: "三室两厅一卫",
    image: "unit-d5-logo.jpg",
    features: ["规整格局", "一体通厅", "飘景主卧", "独立明厨"],
  },
  {
    code: "F2",
    name: "澜轩",
    area: "138",
    room: "三室两厅两卫",
    image: "unit-f2-logo.jpg",
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
      <span className="brand-mark" aria-hidden="true">
        <img src="/assets/brand/cheuk-nang-riverside-mark.png" alt="" />
      </span>
      <span><strong>卓能·河畔轩</strong><small>CHEUK NANG RIVERSIDE</small></span>
    </a>
  );
}

function Header({ solid, open, setOpen, onBooking }) {
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
        <button className="mobile-booking" type="button" onClick={() => { setOpen(false); onBooking(); }}>
          <span>08</span><strong>预约参观</strong><ArrowRight size={20} />
        </button>
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
        <h2>轻享杭州的丰盈生活</h2>
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
          <SectionTitle index="02" en="PROJECT OVERVIEW" title={<><span>大城北崛起</span><span>崇贤正当时</span></>} />
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
          <source src={PROJECT_FILM_URL} type="video/mp4" />
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
        <Reveal><p>THREE VALUE PROPOSITIONS</p><h2>三大利 诚意首开</h2><span>轻享杭州的丰盈生活</span></Reveal>
        <div className="benefit-grid">{items.map(([value, title], index) => <Reveal className="benefit" delay={index * 90} key={title}><span>0{index + 1}</span><p>{title}</p><strong>{value}</strong></Reveal>)}</div>
      </div>
    </section>
  );
}

function Contact({ onBooking }) {
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
          <button className="contact-booking" type="button" onClick={onBooking}>
            <span>预约参观</span><ArrowRight size={18} />
          </button>
        </Reveal>
      </div>
    </section>
  );
}

function BookingModal({ open, onClose }) {
  const nameRef = useRef(null);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    setStatus("idle");
    setMessage("");
    const frame = requestAnimationFrame(() => nameRef.current?.focus());
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();

    if (name.length < 2 || name.length > 30) {
      setStatus("error");
      setMessage("请输入2至30个字符的姓名。");
      return;
    }
    if (!PHONE_PATTERN.test(phone)) {
      setStatus("error");
      setMessage("请输入正确的中国大陆手机号码。");
      return;
    }

    setStatus("submitting");
    setMessage("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(RESERVATION_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          company: String(data.get("company") ?? ""),
        }),
        signal: controller.signal,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "提交失败，请稍后再试。");
      form.reset();
      setStatus("success");
      setMessage("预约已提交，置业顾问会尽快与您联系。");
    } catch (error) {
      setStatus("error");
      setMessage(error.name === "AbortError" ? "网络响应超时，请稍后再试。" : error.message);
    } finally {
      window.clearTimeout(timeout);
    }
  };

  return (
    <div className="booking-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="booking-dialog" role="dialog" aria-modal="true" aria-labelledby="booking-title">
        <button className="booking-close" type="button" onClick={onClose} aria-label="关闭预约表单"><X size={22} /></button>
        <div className="booking-intro">
          <p>PRIVATE VIEWING</p>
          <h2 id="booking-title">预约参观</h2>
          <span>留下联系方式，置业顾问将与您确认到访时间。</span>
        </div>
        {status === "success" ? (
          <div className="booking-success" role="status">
            <span aria-hidden="true">✓</span>
            <h3>提交成功</h3>
            <p>{message}</p>
            <button type="button" onClick={onClose}>完成</button>
          </div>
        ) : (
          <form className="booking-form" onSubmit={handleSubmit}>
            <label>
              <span>姓名</span>
              <input ref={nameRef} name="name" type="text" autoComplete="name" minLength="2" maxLength="30" placeholder="请输入您的姓名" required />
            </label>
            <label>
              <span>手机号码</span>
              <input name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength="20" placeholder="请输入您的手机号码" required />
            </label>
            <label className="booking-honeypot" aria-hidden="true">
              <span>公司</span><input name="company" type="text" tabIndex="-1" autoComplete="off" />
            </label>
            <label className="booking-consent">
              <input name="consent" type="checkbox" required />
              <span>我同意销售人员使用上述信息联系我，仅用于预约参观与项目咨询。</span>
            </label>
            {message && <p className="booking-message" role="alert">{message}</p>}
            <button className="booking-submit" type="submit" disabled={status === "submitting"}>
              <span>{status === "submitting" ? "正在提交" : "确认预约"}</span><ArrowRight size={18} />
            </button>
            <a className="booking-phone" href="tel:057186309988">或致电品鉴热线 0571 8630 9988</a>
          </form>
        )}
      </section>
    </div>
  );
}

function ReservationAdmin() {
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState("idle");
  const [downloadMessage, setDownloadMessage] = useState("");

  const loadRecords = useCallback(async () => {
    setStatus("loading");
    setMessage("");
    try {
      const response = await fetch(ADMIN_ENDPOINT, { credentials: "same-origin" });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        setStatus("login");
        return;
      }
      if (!response.ok) throw new Error(result.message || "后台数据加载失败。");
      setRecords(result.rows || []);
      setTotal(Number(result.total || 0));
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      setMessage(error.message);
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "登录失败。");
      setPassword("");
      await loadRecords();
    } catch (error) {
      setStatus("login");
      setMessage(error.message);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST", credentials: "same-origin" });
    setRecords([]);
    setTotal(0);
    setStatus("login");
  };

  const handleDownload = async () => {
    setDownloadStatus("downloading");
    setDownloadMessage("");
    try {
      const response = await fetch("/api/admin/reservations.csv", { credentials: "same-origin" });
      if (response.status === 401) {
        setMessage("登录已失效，请重新输入管理员密码。");
        setStatus("login");
        setDownloadStatus("idle");
        return;
      }
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.message || "表格导出失败，请稍后重试。");
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `卓能河畔轩预约客户-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1_000);
      setDownloadStatus("success");
      setDownloadMessage("表格已开始下载，请查看浏览器下载列表。");
    } catch (error) {
      setDownloadStatus("error");
      setDownloadMessage(error.message);
    }
  };

  if (["loading", "login", "submitting", "error"].includes(status)) {
    return (
      <main className="admin-login-page">
        <section className="admin-login-card">
          <p>CHEUK NANG RIVERSIDE</p>
          <h1>预约后台</h1>
          <span>输入管理员密码，查看客户预约记录并下载 Excel 表格。</span>
          {status === "loading" ? <div className="admin-loading">正在连接预约数据库…</div> : (
            <form onSubmit={handleLogin}>
              <label><span>管理员密码</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required autoFocus /></label>
              {message && <strong role="alert">{message}</strong>}
              <button type="submit" disabled={status === "submitting"}>{status === "submitting" ? "正在登录" : "进入后台"}</button>
            </form>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <header className="admin-topbar"><Brand light /><button type="button" onClick={handleLogout}>退出登录</button></header>
      <section className="admin-shell">
        <div className="admin-heading">
          <div><p>RESERVATION ADMIN</p><h1>预约客户记录</h1><span>提交时间为中国标准时间，最新记录排在最前。</span></div>
          <div className="admin-action-area">
            <div className="admin-actions"><button type="button" onClick={loadRecords}>刷新</button><button className="admin-download" type="button" onClick={handleDownload} disabled={downloadStatus === "downloading"}>{downloadStatus === "downloading" ? "正在导出…" : "下载 Excel 表格"}</button></div>
            {downloadMessage && <p className={`admin-export-message is-${downloadStatus}`} role="status">{downloadMessage}</p>}
          </div>
        </div>
        <div className="admin-table-card">
          <div className="admin-count"><strong>{total}</strong> 条预约记录</div>
          {records.length ? (
            <div className="admin-table-wrap"><table><thead><tr><th>编号</th><th>姓名</th><th>手机号码</th><th>提交时间</th></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td>{record.id}</td><td>{record.name}</td><td><a href={`tel:${record.phone}`}>{record.phone}</a></td><td>{record.created_at}</td></tr>)}</tbody></table></div>
          ) : <div className="admin-empty">还没有预约记录</div>}
        </div>
      </section>
    </main>
  );
}

function Footer() {
  return (
    <footer><div className="shell footer-inner"><Brand light /><span>CHEUK NANG RIVERSIDE © 2026</span></div></footer>
  );
}

function SiteApp() {
  const [solid, setSolid] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scene, setScene] = useState(0);
  const [unit, setUnit] = useState(0);
  const [bookingOpen, setBookingOpen] = useState(false);
  const openBooking = useCallback(() => setBookingOpen(true), []);
  const closeBooking = useCallback(() => setBookingOpen(false), []);

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
    document.body.classList.toggle("menu-lock", menuOpen || bookingOpen);
    return () => document.body.classList.remove("menu-lock");
  }, [menuOpen, bookingOpen]);

  return (
    <>
      <div className="page-progress" aria-hidden="true" />
      <Header solid={solid} open={menuOpen} setOpen={setMenuOpen} onBooking={openBooking} />
      <button className="booking-float" type="button" onClick={openBooking}>
        <small>PRIVATE VIEWING</small><span>预约参观</span><ArrowRight size={17} />
      </button>
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
        <Contact onBooking={openBooking} />
      </main>
      <Footer />
      <BookingModal open={bookingOpen} onClose={closeBooking} />
    </>
  );
}

export function App() {
  if (
    globalThis.location?.hostname === "records.cheuknangriverside.com"
    || globalThis.location?.hash.startsWith("#/admin/reservations")
  ) return <ReservationAdmin />;
  return <SiteApp />;
}
