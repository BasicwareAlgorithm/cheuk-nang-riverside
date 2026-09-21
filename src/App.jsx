import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  ArrowDown,
  ArrowRight,
  Buildings,
  MapPin,
  Train,
  X,
  List,
} from "@phosphor-icons/react";
import {
  ACTIVE_LOCALE,
  localeLabels,
  localizedHref,
  switchLocalePath,
  tr,
} from "./locales.js";

const MATERIAL = "/assets/ppt";
const PHASE2 = "/assets/phase2";
const PROJECT_FILM_URL = `https://media.cheuknangriverside.com${MATERIAL}/project-film.mp4`;
const DEPLOY_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const CRM_WORKER_ORIGIN = "https://cheuk-nang-riverside.hezhenzhen.workers.dev";
const CRM_APP_ORIGIN = "https://admin.cheuknangriverside.com";
const RESERVATION_ENDPOINT = "/api/reservations";
const ADMIN_ENDPOINT = "/api/admin/reservations";
const CRM_ENDPOINT = import.meta.env.VITE_CRM_API_ORIGIN
  ? `${import.meta.env.VITE_CRM_API_ORIGIN.replace(/\/$/, "")}/api/crm`
  : import.meta.env.DEV || globalThis.location?.origin === CRM_APP_ORIGIN ? "/api/crm" : `${CRM_APP_ORIGIN}/api/crm`;
const PHONE_PATTERN = /^(?:\+?86[- ]?)?1[3-9]\d{9}$/;
const INVITE_STORAGE_KEY = "cnr-invite-code";
const INVITE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const IS_TEST_RESERVATION_ENVIRONMENT = import.meta.env.DEV
  || globalThis.location?.hostname.endsWith(".chatgpt.site")
  || import.meta.env.VITE_RESERVATIONS_ENABLED === "false";
const RESERVATIONS_ENABLED = !IS_TEST_RESERVATION_ENVIRONMENT;

function asset(path) {
  return globalThis.__OFFLINE_ASSETS__?.[path] ?? `${DEPLOY_BASE}${path}`;
}

function normalizeInviteCode(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 32);
}

function normalizeInviteSignature(value) {
  const signature = String(value || "").trim().toLowerCase();
  return /^[0-9a-f]{64}$/.test(signature) ? signature : "";
}

function readInviteContext() {
  const fromUrl = normalizeInviteCode(new URLSearchParams(globalThis.location?.search || "").get("invite"));
  const signatureFromUrl = normalizeInviteSignature(new URLSearchParams(globalThis.location?.search || "").get("sig"));
  if (fromUrl && signatureFromUrl) {
    const invite = { code: fromUrl, signature: signatureFromUrl, expiresAt: Date.now() + INVITE_RETENTION_MS };
    globalThis.localStorage?.setItem(INVITE_STORAGE_KEY, JSON.stringify(invite));
    return invite;
  }
  try {
    const saved = JSON.parse(globalThis.localStorage?.getItem(INVITE_STORAGE_KEY) || "null");
    if (saved?.expiresAt > Date.now()) {
      const code = normalizeInviteCode(saved.code);
      const signature = normalizeInviteSignature(saved.signature);
      if (code && signature) return { code, signature };
    }
    globalThis.localStorage?.removeItem(INVITE_STORAGE_KEY);
  } catch {
    globalThis.localStorage?.removeItem(INVITE_STORAGE_KEY);
  }
  return { code: "", signature: "" };
}

const navLinks = [
  ["品牌", "#heritage"],
  ["区位", "#location"],
  ["项目", "#project"],
  ["社区", "#community"],
  ["影像", "#film"],
  ["户型", "#homes"],
  ["资讯", "/insights/"],
  ["联系", "#contact"],
];

const communityScenes = [
  {
    no: "01",
    title: "鎏光归家",
    en: "ARRIVAL",
    copy: "以更清晰的归家秩序重塑社区入口，让建筑、林荫与礼序在第一眼自然衔接。",
    image: "arrival-gate.jpg",
  },
  {
    no: "02",
    title: "绿野乐园",
    en: "PLAYGROUND",
    copy: "儿童活动、环形场地与林下看护空间相互连接，形成可参与的全龄社区日常。",
    image: "playground.jpg",
  },
  {
    no: "03",
    title: "森氧俱乐部",
    en: "CLUBHOUSE",
    copy: "把休闲、会客与轻运动置入绿荫之间，为社区补充更松弛的共享生活场景。",
    image: "clubhouse-lawn.jpg",
  },
  {
    no: "04",
    title: "疏林悦憩",
    en: "GARDEN",
    copy: "疏林、花境与邻里停留空间共同构成安静而有层次的社区花园。",
    image: "sparse-grove.jpg",
  },
];

const amenityFacts = [
  { status: "在建", title: "地铁15号线崇贤站", copy: "资料显示A出入口距项目西门约200米、距主入口约350米，计划2028年开通。" },
  { status: "已运营", title: "全龄教育资源", copy: "项目约2公里范围内覆盖幼儿园、小学与中学；具体招生范围以教育主管部门最新政策为准。" },
  { status: "已运营／待核实", title: "商业生活圈", copy: "上亿广场及招商城北花园城等商业资源位于项目约1.5公里生活半径内，运营状态以实地为准。" },
  { status: "在建／规划", title: "医疗健康配套", copy: "区域资料列示邵逸夫医院分院、临平区中医院崇贤分院等医疗资源，交付与运营时间以官方信息为准。" },
  { status: "生态实景", title: "滨水公园体系", copy: "项目与石塘公园隔河相望，周边分布半山国家森林公园、虎山公园等生态资源。" },
];

const milestones = [
  { year: "1961", label: "专业起点", copy: "赵世曾博士于英国杜伦大学建筑系毕业。" },
  { year: "1962", label: "建筑实践", copy: "加入香港政府建筑署担任建筑师。" },
  { year: "1963", label: "企业前身", copy: "公司前身远东羊毛纤维有限公司成立。" },
  { year: "1972/1973", label: "事业发展", copy: "华光控股成立并上市。" },
  { year: "1988", label: "卓能启程", copy: "赵世曾博士收购远东并更名为卓能，集团由此开启新的发展阶段。", featured: true },
  { year: "2004", label: "专业荣誉", copy: "获莫里森大学荣誉哲学博士学位，并获杰出华人奖。" },
  { year: "2015", label: "战略拓展", copy: "出售卓能广场总部并将资金重新投入中国内地、马来西亚和澳门的发展项目。" },
  { year: "2016", label: "区域认可", copy: "荣获东盟杰出奖。" },
];

const groupFootprints = [
  {
    region: "中国香港",
    image: "group-works-hk.jpg",
    projects: ["卓能广场", "卓能山庄", "卓能中心", "赵苑", "一号九龙山顶", "新赵苑"],
  },
  {
    region: "中国内地与澳门",
    image: "group-works-regional.jpg",
    projects: ["深圳卓能雅苑", "澳门住宅及酒店式公寓项目"],
  },
];

const groupBusiness = [
  ["物业销售", "开发高端住宅、别墅、商业综合体与写字楼。"],
  ["物业租赁", "持有香港及海外商业、写字楼与公寓物业。"],
  ["物业管理", "为住宅、商业与会所提供配套运营服务。"],
  ["金融投资", "配置港股、债券及海外证券资产。"],
];

const projectMetrics = [
  ["12.3万㎡", "项目总建筑面积"],
  ["约9万㎡", "地上建筑面积"],
  ["约3.3万㎡", "地下建筑面积"],
  ["约8.96万㎡", "计容建筑面积"],
  ["约8.1万㎡", "高层公寓可售面积"],
  ["约4750㎡", "排屋面积"],
  ["约1600㎡", "商铺面积"],
  ["840套", "规划住宅"],
  ["779个", "规划车位"],
  ["约580个", "可售车位"],
  ["约53%", "90㎡以下户型占比"],
  ["约47%", "90㎡以上户型占比"],
];

const contextPanels = [
  {
    no: "01",
    label: "城市规划",
    title: "大城北与崇贤新城",
    copy: "资料将崇贤新城归入杭州大城北重点建设范围，并列示2024—2026年三年行动计划。规划内容应以政府部门最新公示为准。",
  },
  {
    no: "02",
    label: "公共交通",
    title: "公交与轨道接驳",
    copy: "材料列示329、B7、490/490A、379、397、547M、347及8220等线路；实际站点与班次以公交运营信息为准。",
  },
  {
    no: "03",
    label: "远期轨道",
    title: "地铁14号线规划",
    copy: "规划中的14号线有望服务崇贤新城，相关线路、站点和建设时序仍处于规划阶段。",
  },
  {
    no: "04",
    label: "产业发展",
    title: "陆家桥数智产业园",
    copy: "项目材料将其定位为高端医疗器械智造基地；建设进度、企业入驻及岗位数据以园区和政府最新信息为准。",
  },
];

const renewalGallery = [
  ["landscape-masterplan.jpg", "景观功能总平面", "规划图"],
  ["commercial-street.jpg", "商业街", "改造效果图"],
  ["north-entrance.jpg", "北入口", "改造效果图"],
  ["east-entrance.jpg", "东入口", "改造效果图"],
  ["liuguang-courtyard.jpg", "鎏光庭院", "改造效果图"],
  ["playground.jpg", "绿野乐园", "改造效果图"],
  ["art-screen.jpg", "艺术屏风", "改造效果图"],
  ["liuguang-island.jpg", "流光翠岛", "改造效果图"],
  ["sparse-grove.jpg", "疏林悦憩", "改造效果图"],
];

const salesJourney = [
  ["sales-centre-plan.jpg", "空间总览", "平面布局"],
  ["sales-lobby.jpg", "抵达", "前厅效果图"],
  ["sales-waterbar.jpg", "停留", "水吧区效果图"],
  ["sales-corridor.jpg", "过渡", "过道区效果图"],
  ["sales-signing-room.jpg", "洽谈", "签约室效果图"],
  ["sales-restroom.jpg", "细节", "卫生间效果图"],
];

const showroomScenes = [
  ["small-living.jpg", "约67㎡ 苏式原木风", "客餐厅效果图"],
  ["small-bedroom.jpg", "约67㎡ 苏式原木风", "主卧效果图"],
  ["large-entry.jpg", "约138㎡ 美式风格", "入户玄关效果图"],
  ["large-living.jpg", "约138㎡ 美式风格", "客餐厅效果图"],
  ["large-main-bedroom.jpg", "约138㎡ 美式风格", "主卧效果图"],
  ["large-shower.jpg", "约138㎡ 美式风格", "淋浴间效果图"],
  ["large-bedroom.jpg", "约138㎡ 美式风格", "客卧效果图"],
];

const unitTypes = [
  {
    code: "A1",
    name: "拾光",
    area: "65",
    room: "一室两厅一卫",
    image: "unit-a1.jpg",
    audience: "初次置业与一人居",
    features: ["通透格局", "客餐一体", "独立角厨", "飘窗主卧"],
  },
  {
    code: "A2",
    name: "拾屿",
    area: "67",
    room: "两室两厅一卫",
    image: "unit-a2.jpg",
    audience: "两口之家与成长型一居",
    features: ["全明空间", "科学布局", "阔绰通厅", "南向主卧"],
  },
  {
    code: "D5",
    name: "澜岸",
    area: "88",
    room: "三室两厅一卫",
    image: "unit-d5.jpg",
    audience: "小家庭与弹性三房需求",
    features: ["规整格局", "一体通厅", "飘景主卧", "独立明厨"],
  },
  {
    code: "F2",
    name: "澜轩",
    area: "138",
    room: "三室两厅两卫",
    image: "unit-f2.jpg",
    audience: "改善家庭与多代同住",
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
    <a className={`brand ${light ? "is-light" : ""}`} href={localizedHref("/#top")} aria-label={tr("卓能河畔轩首页")}>
      <span className="brand-mark" aria-hidden="true">
        <img src={asset("/assets/brand/cheuk-nang-riverside-mark.png")} alt="" />
      </span>
      <span><strong>{tr("卓能·河畔轩")}</strong><small>CHEUK NANG RIVERSIDE</small></span>
    </a>
  );
}

function LanguageSwitcher({ compact = false }) {
  return (
    <nav className={`language-switcher ${compact ? "is-compact" : ""}`} aria-label={tr("切换语言")}>
      {localeLabels.map((item) => (
        <a
          className={item.locale === ACTIVE_LOCALE ? "is-active" : ""}
          href={switchLocalePath(item.locale)}
          hrefLang={item.locale}
          lang={item.locale}
          key={item.locale}
          onClick={() => globalThis.localStorage?.setItem("cnr-preferred-locale", item.locale)}
        >{compact ? item.short : item.label}</a>
      ))}
    </nav>
  );
}

function Header({ solid, open, setOpen, onBooking }) {
  return (
    <header className={`site-header ${solid || open ? "is-solid" : ""}`}>
      <Brand light={!solid && !open} />
      <nav aria-label={tr("主导航")}>
        {navLinks.map(([label, href]) => <a href={localizedHref(href)} key={href}>{tr(label)}</a>)}
      </nav>
      <div className="header-tools"><LanguageSwitcher compact /><a className="header-call" href="tel:057186309988"><span>{tr("品鉴热线")}</span><strong>0571 8630 9988</strong></a></div>
      <button className="menu-toggle" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={tr(open ? "关闭导航" : "打开导航")} data-testid="mobile-menu-button">
        {open ? <X size={25} /> : <List size={27} />}
      </button>
      <div className={`mobile-menu ${open ? "is-open" : ""}`}>
        <p>CHEUK NANG RIVERSIDE</p>
        {navLinks.map(([label, href], index) => (
          <a href={localizedHref(href)} key={href} onClick={() => setOpen(false)}>
            <span>{String(index + 1).padStart(2, "0")}</span><strong>{tr(label)}</strong><ArrowRight size={20} />
          </a>
        ))}
        <button className="mobile-booking" type="button" onClick={() => { setOpen(false); onBooking(); }}>
          <span>09</span><strong>{tr("预约参观")}</strong><ArrowRight size={20} />
        </button>
        <LanguageSwitcher />
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero" id="top">
      <img className="hero-image" src={asset(`${PHASE2}/hero-riverside.jpg`)} alt={tr("卓能河畔轩水岸实景")} fetchPriority="high" />
      <div className="hero-veil" />
      <div className="hero-line hero-line-a" /><div className="hero-line hero-line-b" />
      <div className="hero-copy">
        <p className="hero-kicker">{tr("卓能集团 · 首献杭州")}</p>
        <h1><span>{tr("卓能")}</span><em>·</em><span>{tr("河畔轩")}</span></h1>
        <div className="hero-rule" />
        <h2>{tr("轻享杭州的丰盈生活")}</h2>
        <p className="hero-meta">{tr("临平崇贤 · 滨水生活 · 建面约65-138㎡多元户型")}</p>
        <span className="visual-status">{tr("水岸实景")}</span>
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
      <img className="heritage-bg" src={asset(`${MATERIAL}/group-estate.jpeg`)} alt={tr("卓能集团香港物业实景")} />
      <div className="heritage-shade" />
      <div className="shell heritage-inner">
        <Reveal>
          <SectionTitle index="01" en="GROUP HERITAGE" title={tr("实力港企 卓能集团首献杭州")} light />
          <p className="heritage-copy">{tr("卓能（控股）有限公司成立于1963年；1988年由赵世曾博士收购并更名为卓能。集团专注物业发展与投资，业务布局香港、中国内地、澳门及马来西亚。")}</p>
        </Reveal>
        <div className="heritage-stats">
          {[["1963", "企业成立"], ["0131", "港交所股份代号"], ["4", "主要市场布局"]].map(([value, label], index) => (
            <Reveal className="heritage-stat" delay={index * 90} key={label}><strong>{value}</strong><span>{tr(label)}</span></Reveal>
          ))}
        </div>
      </div>
      <span className="chapter-sign">Cheuk Nang Group</span>
    </section>
  );
}

function Timeline() {
  return (
    <section className="timeline paper" id="timeline">
      <div className="shell timeline-shell">
        <SectionTitle index="01—08" en="MILESTONES" title={tr("沿时间长河 稳健前行")} intro={tr("从建筑专业起点到跨区域物业发展，时间线梳理卓能重要人物与企业历程。个人经历与公司事件分别标注，避免混为同一口径。")} />
        <ol className="timeline-list">
          {milestones.map((item, index) => (
            <li className={item.featured ? "is-featured" : ""} key={item.year}>
              <i aria-hidden="true" />
              <Reveal className="timeline-entry" delay={(index % 3) * 60}>
                {item.featured && <img src={asset("/assets/brand/cheuk-nang-riverside-mark.png")} alt="" />}
                <span>{tr(item.label)}</span>
                <h3>{item.year}</h3>
                <p>{tr(item.copy)}</p>
              </Reveal>
            </li>
          ))}
        </ol>
        <p className="source-note">{tr("时间线依据卓能集团官网公开资料及二期项目材料整理，展示内容用于品牌历程说明。")}</p>
      </div>
    </section>
  );
}

function GroupFootprint() {
  return (
    <section className="group-footprint paper" id="group-footprint">
      <div className="shell">
        <SectionTitle index="01B" en="SELECTED PROJECTS" title={tr("从香港出发 布局多元市场")} intro={tr("代表项目按照二期案场说辞与楼书整理，作为集团开发经验的简要索引。")} />
        <div className="business-grid">
          {groupBusiness.map(([title, copy], index) => (
            <Reveal delay={index * 50} key={title}><span>0{index + 1}</span><h3>{tr(title)}</h3><p>{tr(copy)}</p></Reveal>
          ))}
        </div>
        <div className="footprint-grid">
          {groupFootprints.map((group, index) => (
            <Reveal className="footprint-card" delay={index * 90} key={group.region}>
              <img src={asset(`${PHASE2}/${group.image}`)} alt={tr(`${group.region}代表项目`)} loading="lazy" />
              <div>
                <span>{String(index + 1).padStart(2, "0")} · {tr(group.region)}</span>
                <ul>{group.projects.map((project) => <li key={project}>{tr(project)}</li>)}</ul>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="source-note">{tr("项目名称与区域来自二期项目资料，具体物业状态及最新用途以卓能集团公开信息为准。")}</p>
      </div>
    </section>
  );
}

function Project() {
  return (
    <section className="project paper" id="project">
      <div className="shell project-grid">
        <Reveal className="project-copy">
          <SectionTitle index="02" en="PROJECT OVERVIEW" title={<><span>{tr("水岸现房")}</span><span>{tr("焕新归来")}</span></>} />
          <h3>{tr("丰盈生活的社区底图")}</h3>
          <p>{tr("项目位于杭州临平区崇贤板块，总建筑面积约12.3万平方米，规划840套住宅与779个车位。本网站呈现建筑、景观、售楼处和样板间焕新方案。")}</p>
          <dl>
            <div><dt>{ACTIVE_LOCALE === "en" ? "123,000" : "12.3"}<small>{tr("万㎡")}</small></dt><dd>{tr("项目总建筑面积")}</dd></div>
            <div><dt>840<small>{tr("套")}</small></dt><dd>{tr("规划住宅")}</dd></div>
            <div><dt>779<small>{tr("个")}</small></dt><dd>{tr("规划车位")}</dd></div>
          </dl>
          <a className="text-link" href="#film">{tr("观看项目影片")} <ArrowRight size={18} /></a>
        </Reveal>
        <Reveal className="project-visual" delay={120}>
          <figure className="project-main"><img src={asset(`${MATERIAL}/river-view.jpeg`)} alt={tr("卓能河畔轩水岸实景")} /><figcaption>{tr("水岸实景")}</figcaption></figure>
          <figure className="project-inset"><img src={asset(`${PHASE2}/arrival-gate.jpg`)} alt={tr("卓能河畔轩入口改造效果图")} /><figcaption>{tr("入口改造效果图")}</figcaption></figure>
          <span className="project-ring" aria-hidden="true" />
        </Reveal>
      </div>
    </section>
  );
}

function ProjectArchive() {
  return (
    <section className="project-archive" id="project-record">
      <div className="shell">
        <div className="archive-heading">
          <p>PROJECT RECORD · JUNE 2026</p>
          <h2>{tr("项目数据档案")}</h2>
          <span>{tr("下列数据依据2026年6月项目介绍整理，最终以最新批准文件和销售资料为准。")}</span>
        </div>
        <dl className="archive-grid">
          {projectMetrics.map(([value, label], index) => (
            <Reveal delay={(index % 4) * 45} key={label}><dt>{tr(value)}</dt><dd>{tr(label)}</dd></Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}

function HangzhouChapter() {
  return (
    <section className="chapter-hangzhou">
      <img src={asset(`${MATERIAL}/hangzhou-city-clean.jpg`)} alt={tr("杭州城市与水系航拍")} />
      <div className="chapter-overlay" />
      <Reveal className="chapter-copy">
        <p>PART.2 · ENJOY HANGZHOU</p>
        <h2>{tr("纵享")}<span>{tr("杭州")}</span>{tr("丰盈")}</h2>
        <strong>{tr("大城丰盈 · 尽享暮景\n千亿大城北，崇贤新城乘势而上").split("\n").map((line, index) => <span key={line}>{line}{index === 0 && <br />}</span>)}</strong>
      </Reveal>
    </section>
  );
}

function Location() {
  return (
    <section className="location paper" id="location">
      <div className="shell">
        <SectionTitle index="03" en="LOCATION & CONNECTION" title={tr("多维路网 通达全城")} intro={tr("邻立拱墅，全维配套触手可及；一城繁华与自然资源，在日常半径内从容抵达。")} />
        <div className="location-grid phase2-location-grid">
          <Reveal className="map-frame"><img src={asset(`${PHASE2}/location-map.jpg`)} alt={tr("卓能河畔轩区位与城市配套图")} /></Reveal>
          <div className="location-facts">
            {amenityFacts.map((item, index) => (
              <Reveal className="location-fact" delay={index * 60} key={item.title}>
                {index === 0 ? <Train size={27} weight="thin" /> : index < 4 ? <Buildings size={27} weight="thin" /> : <MapPin size={27} weight="thin" />}
                <span>{tr(item.status)}</span><h3>{tr(item.title)}</h3><p>{tr(item.copy)}</p>
              </Reveal>
            ))}
          </div>
        </div>
        <p className="source-note">{tr("配套距离、建设进度及招生范围来自2026年项目资料，最终以政府部门、运营机构及现场实际为准。")}</p>
      </div>
    </section>
  );
}

function ContextDetails() {
  return (
    <section className="context-details paper" id="city-context">
      <div className="shell">
        <SectionTitle index="03B" en="CITY CONTEXT" title={tr("把通勤与发展 放进同一张生活地图")} intro={tr("补充公交、远期轨道、城市规划与产业信息；所有未来事项均保持规划或待核实状态。")} />
        <div className="context-grid">
          {contextPanels.map((item, index) => (
            <Reveal className="context-panel" delay={index * 55} key={item.no}>
              <span>{item.no} · {tr(item.label)}</span><h3>{tr(item.title)}</h3><p>{tr(item.copy)}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Community({ active, setActive }) {
  const scene = communityScenes[active];
  return (
    <section className="lifestyle" id="community">
      <img key={scene.image} className="lifestyle-bg" src={asset(`${PHASE2}/${scene.image}`)} alt={tr(scene.title)} />
      <div className="lifestyle-shade" />
      <div className="lifestyle-head"><span>04</span><p>COMMUNITY RENEWAL</p><h2>{tr("鎏光逸境 焕新社区")}</h2></div>
      <div className="lifestyle-content">
        <p>{scene.en}</p><h3>{tr(scene.title)}</h3><strong>{tr(scene.copy)}</strong><em>{tr("改造效果图")}</em>
      </div>
      <div className="scene-tabs">
        {communityScenes.map((item, index) => (
          <button className={index === active ? "is-active" : ""} type="button" onMouseEnter={() => setActive(index)} onFocus={() => setActive(index)} onClick={() => setActive(index)} key={item.no}>
            <span>{item.no}</span><strong>{tr(item.title)}</strong><i />
          </button>
        ))}
      </div>
    </section>
  );
}

function RenewalGallery() {
  return (
    <section className="renewal-gallery paper" id="renewal-gallery">
      <div className="shell">
        <SectionTitle index="04B" en="LANDSCAPE MASTERPLAN" title={tr("从一张总图 走入九重场景")} intro={tr("将商业街、社区入口、庭院、儿童活动与林下休憩串联为完整的景观焕新路径。")} />
      </div>
      <div className="gallery-rail" aria-label={tr("社区景观改造画廊")}>
        {renewalGallery.map(([image, title, status], index) => (
          <figure className={index === 0 ? "is-plan" : ""} key={image}>
            <img src={asset(`${PHASE2}/${image}`)} alt={`${tr(title)} ${tr(status)}`} loading="lazy" />
            <figcaption><span>{String(index + 1).padStart(2, "0")} · {tr(status)}</span><strong>{tr(title)}</strong></figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function SalesCentre() {
  return (
    <section className="sales-centre" id="sales-centre">
      <div className="shell">
        <SectionTitle index="04C" en="SALES CENTRE" title={tr("从抵达 到从容洽谈")} intro={tr("以空间总览、前厅、水吧、过道、签约室与卫生间组成完整的案场体验路径。")} light />
      </div>
      <div className="sales-journey">
        {salesJourney.map(([image, title, caption], index) => (
          <figure key={image}>
            <img src={asset(`${PHASE2}/${image}`)} alt={tr(caption)} loading="lazy" />
            <figcaption><span>{String(index + 1).padStart(2, "0")} · {tr(title)}</span><strong>{tr(caption)}</strong></figcaption>
          </figure>
        ))}
      </div>
      <p className="shell sales-note">{tr("本章节均为售楼处改造效果图，实际空间以最终实施及现场呈现为准。")}</p>
    </section>
  );
}

function Interiors() {
  return (
    <section className="interiors paper" id="interiors">
      <div className="shell">
        <SectionTitle index="05" en="INTERIOR COLLECTION" title={tr("从空间尺度 预见生活日常")} intro={tr("以约67㎡和约138㎡两类样板间方案，呈现不同家庭结构下的收纳、会客与休憩场景。")} />
        <div className="interior-grid">
          {showroomScenes.map(([image, title, caption], index) => (
            <Reveal className={`interior-card interior-card-${index + 1}`} delay={index * 70} key={image}>
              <img src={asset(`${PHASE2}/${image}`)} alt={`${tr(title)} ${tr(caption)}`} loading="lazy" />
              <div><span>{tr("室内效果图")}</span><h3>{tr(title)}</h3><p>{tr(caption)}</p></div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Film() {
  return (
    <section className="film" id="film">
      <div className="film-title shell">
        <SectionTitle index="06" en="PROJECT FILM" title={tr("循水入境 看见焕新蓝图")} intro={tr("项目影片保留完整播放入口；画面所示实景与效果方案以现场及最终实施结果为准。")} light />
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
        <SectionTitle index="07" en="HOME COLLECTION" title={tr("多元户型 回应不同家庭结构")} intro={tr("建面约65-138㎡四类户型，以清晰的功能分区承接初次置业、家庭成长与改善需求。")} />
        <div className="home-tabs" role="tablist" aria-label={tr("户型选择")}>
          {unitTypes.map((item, index) => (
            <button type="button" role="tab" aria-selected={index === active} className={index === active ? "is-active" : ""} onClick={() => setActive(index)} key={item.code}>
              <span>{item.code}</span><strong>{tr(item.name)}</strong><em>{tr("约")}{item.area}{tr("㎡")}</em>
            </button>
          ))}
        </div>
        <div className="home-detail">
          <Reveal className="home-copy" key={`${unit.code}-copy`}>
            <p>{unit.code} · {tr(unit.name)}</p><h3>{tr("约")}<strong>{unit.area}</strong><small>{tr("㎡")}</small></h3><h4>{tr(unit.room)}</h4><span className="home-audience">{tr(unit.audience)}</span>
            <ul>{unit.features.map((feature) => <li key={feature}>{tr(feature)}</li>)}</ul>
            <a className="text-link" href="#contact">{tr("预约品鉴")} <ArrowRight size={18} /></a>
          </Reveal>
          <Reveal className="home-plan phase2-home-plan" key={`${unit.code}-plan`} delay={90}><img src={asset(`${PHASE2}/${unit.image}`)} alt={`${unit.code} ${tr(unit.name)} ${tr("约")}${unit.area}${tr("㎡")}`} /></Reveal>
        </div>
      </div>
    </section>
  );
}

function Benefits() {
  const items = [
    ["一河相望", "滨水生态日常"],
    ["15号线在建", "城市南北通达"],
    ["65-138㎡", "多元家庭选择"],
  ];
  return (
    <section className="benefits">
      <div className="shell benefits-inner">
        <Reveal><p>THREE LIVING DIMENSIONS</p><h2>{tr("丰盈生活 由此展开")}</h2><span>{tr("所有配套与产品信息均以最新公示及现场实际为准")}</span></Reveal>
        <div className="benefit-grid">{items.map(([value, title], index) => <Reveal className="benefit" delay={index * 90} key={title}><span>0{index + 1}</span><p>{tr(title)}</p><strong>{tr(value)}</strong></Reveal>)}</div>
      </div>
    </section>
  );
}

function Contact({ onBooking }) {
  return (
    <section className="contact" id="contact">
      <img src={asset(`${MATERIAL}/contact-clean.jpg`)} alt={tr("杭州城市天际线")} />
      <div className="contact-shade" />
      <div className="shell contact-inner">
        <Reveal>
          <p>CHEUK NANG GROUP · HANGZHOU</p>
          <h2>{tr("卓能集团 · 首献杭州")}</h2>
          <span>{tr("临平崇贤 · 滨水生活 · 建面约65-138㎡多元户型")}</span>
        </Reveal>
        <Reveal className="contact-actions" delay={100}>
          <p>{tr("品鉴热线")}</p><a className="phone-link" href="tel:057186309988">0571 <strong>86309988</strong></a>
          <span><MapPin size={17} /><span>{tr("杭州市临平区崇贤街道崇杭街108-17号卓能河畔轩销售中心")}</span></span>
          <button className="contact-booking" type="button" onClick={onBooking}>
            <span>{tr("预约参观")}</span><ArrowRight size={18} />
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
      setMessage(tr("请输入2至30个字符的姓名。"));
      return;
    }
    if (!PHONE_PATTERN.test(phone)) {
      setStatus("error");
      setMessage(tr("请输入正确的中国大陆手机号码。"));
      return;
    }

    if (!RESERVATIONS_ENABLED) {
      form.reset();
      setStatus("success");
      setMessage(tr("这是测试表单，提交内容不会保存或发送给销售人员。"));
      return;
    }

    setStatus("submitting");
    setMessage("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    const invite = readInviteContext();

    try {
      const response = await fetch(RESERVATION_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          company: String(data.get("company") ?? ""),
          inviteCode: invite.code,
          inviteSignature: invite.signature,
        }),
        signal: controller.signal,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || tr("提交失败，请稍后再试。"));
      form.reset();
      setStatus("success");
      setMessage(tr("预约已提交，置业顾问会尽快与您联系。"));
    } catch (error) {
      setStatus("error");
      setMessage(error.name === "AbortError" ? tr("网络响应超时，请稍后再试。") : error.message);
    } finally {
      window.clearTimeout(timeout);
    }
  };

  return (
    <div className="booking-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="booking-dialog" role="dialog" aria-modal="true" aria-labelledby="booking-title">
        <button className="booking-close" type="button" onClick={onClose} aria-label={tr("关闭预约表单")}><X size={22} /></button>
        <div className="booking-intro">
          <p>PRIVATE VIEWING</p>
          <h2 id="booking-title">{tr("预约参观")}</h2>
          <span>{tr("留下联系方式，置业顾问将与您确认到访时间。")}</span>
        </div>
        {status === "success" ? (
          <div className="booking-success" role="status">
            <span aria-hidden="true">✓</span>
            <h3>{tr("提交成功")}</h3>
            <p>{message}</p>
            <button type="button" onClick={onClose}>{tr("完成")}</button>
          </div>
        ) : (
          <form className="booking-form" onSubmit={handleSubmit}>
            {!RESERVATIONS_ENABLED && <p className="booking-test-note">{tr("测试环境：你可以体验表单流程，但提交内容不会保存或发送。")}</p>}
            <label>
              <span>{tr("姓名")}</span>
              <input ref={nameRef} name="name" type="text" autoComplete="name" minLength="2" maxLength="30" placeholder={tr("请输入您的姓名")} required />
            </label>
            <label>
              <span>{tr("手机号码")}</span>
              <input name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength="20" placeholder={tr("请输入您的手机号码")} required />
            </label>
            <label className="booking-honeypot" aria-hidden="true">
              <span>{tr("公司")}</span><input name="company" type="text" tabIndex="-1" autoComplete="off" />
            </label>
            <label className="booking-consent">
              <input name="consent" type="checkbox" required />
              <span>{tr("我同意销售人员使用上述信息联系我，仅用于预约参观与项目咨询。")}</span>
            </label>
            {message && <p className="booking-message" role="alert">{message}</p>}
            <button className="booking-submit" type="submit" disabled={status === "submitting"}>
              <span>{tr(status === "submitting" ? "正在提交" : "确认预约")}</span><ArrowRight size={18} />
            </button>
            <a className="booking-phone" href="tel:057186309988">{tr("或致电品鉴热线 0571 8630 9988")}</a>
          </form>
        )}
      </section>
    </div>
  );
}

function LanguageSuggestion() {
  const [suggestedLocale, setSuggestedLocale] = useState("");

  useEffect(() => {
    if (globalThis.localStorage?.getItem("cnr-language-suggestion-dismissed")) return;
    if (globalThis.localStorage?.getItem("cnr-preferred-locale")) return;
    const browserLocale = globalThis.navigator?.languages?.[0] || globalThis.navigator?.language || "";
    if (ACTIVE_LOCALE === "zh-CN" && /^zh-(?:HK|MO|TW)/i.test(browserLocale)) setSuggestedLocale("zh-HK");
    else if (ACTIVE_LOCALE === "zh-CN" && browserLocale && !/^zh\b/i.test(browserLocale)) setSuggestedLocale("en");
  }, []);

  if (!suggestedLocale) return null;
  const dismiss = () => {
    globalThis.localStorage?.setItem("cnr-language-suggestion-dismissed", "1");
    setSuggestedLocale("");
  };
  const label = suggestedLocale === "zh-HK" ? tr("选择繁體中文") : tr("选择英文");

  return (
    <aside className="language-suggestion" aria-live="polite">
      <p>{tr("根据您的浏览器语言，我们为您准备了更合适的版本。")}</p>
      <div>
        <a href={switchLocalePath(suggestedLocale)} onClick={() => globalThis.localStorage?.setItem("cnr-preferred-locale", suggestedLocale)}>{label}</a>
        <button type="button" onClick={dismiss}>{tr("暂不切换")}</button>
      </div>
    </aside>
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

const crmStatuses = [
  ["new", "新登记"], ["contacted", "已联系"], ["appointment", "已预约"], ["visited", "已到访"],
  ["intent", "意向跟进"], ["closed", "已成交／关闭"], ["invalid", "无效"],
];

function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("二维码图片生成失败。"));
    image.src = source;
  });
}

async function createInviteQrCard({ displayName, inviteUrl }) {
  const qrDataUrl = await QRCode.toDataURL(inviteUrl, {
    errorCorrectionLevel: "H",
    margin: 3,
    width: 720,
    color: { dark: "#071d34", light: "#ffffff" },
  });
  const qrImage = await loadImage(qrDataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1440;
  const context = canvas.getContext("2d");
  context.fillStyle = "#f4f0e9";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#071d34";
  context.fillRect(0, 0, canvas.width, 300);
  context.fillStyle = "#dec898";
  context.fillRect(110, 198, 860, 2);
  context.textAlign = "center";
  context.fillStyle = "#ffffff";
  context.font = '500 58px "Songti SC", serif';
  context.fillText("卓能 · 河畔轩", 540, 115);
  context.font = "24px Georgia, serif";
  context.fillText("CHEUK NANG RIVERSIDE", 540, 158);
  context.fillStyle = "#071d34";
  context.font = '500 42px "Songti SC", serif';
  context.fillText("官方专属邀约", 540, 385);
  context.fillStyle = "#68737c";
  context.font = "26px sans-serif";
  context.fillText(`置业顾问：${displayName}`, 540, 432);
  context.fillStyle = "#ffffff";
  context.fillRect(150, 500, 780, 780);
  context.drawImage(qrImage, 180, 530, 720, 720);
  context.strokeStyle = "#b48b4e";
  context.lineWidth = 2;
  context.strokeRect(150, 500, 780, 780);
  context.fillStyle = "#071d34";
  context.font = '500 34px "Songti SC", serif';
  context.fillText("扫码预约参观", 540, 1350);
  context.fillStyle = "#68737c";
  context.font = "20px sans-serif";
  context.fillText("请认准卓能·河畔轩官方域名", 540, 1390);
  return canvas.toDataURL("image/png");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const source = String(text || "").replace(/^\ufeff/, "");
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '"' && quoted && source[index + 1] === '"') { cell += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && source[index + 1] === "\n") index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  if (rows.length < 2) return [];
  const headers = rows[0];
  const value = (record, names) => {
    const position = headers.findIndex((header) => names.includes(header));
    return position >= 0 ? record[position] || "" : "";
  };
  return rows.slice(1).map((record) => ({
    name: value(record, ["客户姓名", "姓名", "name"]),
    phone: value(record, ["手机号", "手机号码", "phone"]),
    salesLoginPhone: value(record, ["销售登录手机号", "销售手机号", "sales_phone"]),
    status: value(record, ["状态", "status"]) || "new",
    note: value(record, ["备注", "跟进备注", "note"]),
    nextFollowupAt: value(record, ["下次跟进时间", "next_followup_at"]),
  }));
}

function CrmAdmin() {
  const [status, setStatus] = useState("checking");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [adminToken, setAdminToken] = useState("");
  const [admin, setAdmin] = useState(null);
  const [loginForm, setLoginForm] = useState({ loginName: "admin", password: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", nextPassword: "" });
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [sales, setSales] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [leads, setLeads] = useState([]);
  const [newSales, setNewSales] = useState({ displayName: "", loginName: "", inviteCode: "", password: "" });
  const [assignments, setAssignments] = useState({});
  const [activeView, setActiveView] = useState("sales");
  const [salesSearch, setSalesSearch] = useState("");
  const [leadSearch, setLeadSearch] = useState("");
  const [leadStatus, setLeadStatus] = useState("");
  const [assignmentSalesSearch, setAssignmentSalesSearch] = useState("");
  const [newAdmin, setNewAdmin] = useState({ displayName: "", loginPhone: "", role: "viewer", password: "" });
  const [salesTotal, setSalesTotal] = useState(0);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [salesNextCursor, setSalesNextCursor] = useState(null);
  const [leadsNextCursor, setLeadsNextCursor] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [batchAssignment, setBatchAssignment] = useState({ salesId: "", reason: "" });
  const [importState, setImportState] = useState({ filename: "", rows: [], preview: [], summary: null });
  const [mergeState, setMergeState] = useState({ masterId: "", reason: "" });

  useEffect(() => {
    fetch(`${CRM_ENDPOINT}/admin/bootstrap`)
      .then((response) => response.json())
      .then((result) => { setStatus("login"); if (result.required) setMessage("首次登录请使用账号 admin 和现有共享管理员密码，系统会自动完成初始化。"); })
      .catch(() => { setStatus("error"); setMessage("管理员初始化状态加载失败。"); });
  }, []);

  const load = useCallback(async (token, { silent = false } = {}) => {
    if (!token) { setStatus("login"); return; }
    if (!silent) { setStatus("loading"); setMessage(""); }
    try {
      const headers = { authorization: `Bearer ${token}` };
      const salesParams = new URLSearchParams({ page_size: "100" });
      const leadsParams = new URLSearchParams({ page_size: "100" });
      if (salesSearch.trim()) salesParams.set("q", salesSearch.trim());
      if (leadSearch.trim()) leadsParams.set("q", leadSearch.trim());
      if (leadStatus) leadsParams.set("status", leadStatus);
      const [meResponse, salesResponse, leadsResponse] = await Promise.all([
        fetch(`${CRM_ENDPOINT}/admin/me`, { headers }),
        fetch(`${CRM_ENDPOINT}/admin/sales?${salesParams}`, { headers }),
        fetch(`${CRM_ENDPOINT}/admin/leads?${leadsParams}`, { headers }),
      ]);
      if (meResponse.status === 401 || salesResponse.status === 401 || leadsResponse.status === 401) {
        setStatus("login");
        return;
      }
      const meData = await meResponse.json().catch(() => ({}));
      const salesData = await salesResponse.json().catch(() => ({}));
      const leadsData = await leadsResponse.json().catch(() => ({}));
      if (!meResponse.ok) throw new Error(meData.message || "管理员账号加载失败。");
      if (!salesResponse.ok) throw new Error(salesData.message || "CRM 销售账号加载失败。");
      if (!leadsResponse.ok) throw new Error(leadsData.message || "CRM 客户列表加载失败。");
      setAdmin(meData.admin);
      setSales(salesData.sales || []);
      setLeads(leadsData.leads || []);
      setSalesTotal(Number(salesData.total || 0));
      setLeadsTotal(Number(leadsData.total || 0));
      setSalesNextCursor(salesData.next_cursor || null);
      setLeadsNextCursor(leadsData.next_cursor || null);
      if (meData.admin?.permissions?.includes("admin_manage")) {
        const [adminsResponse, auditResponse] = await Promise.all([fetch(`${CRM_ENDPOINT}/admin/admins`, { headers }), fetch(`${CRM_ENDPOINT}/admin/audit?page_size=20`, { headers })]);
        const adminsData = await adminsResponse.json().catch(() => ({}));
        const auditData = await auditResponse.json().catch(() => ({}));
        if (adminsResponse.ok) setAdmins(adminsData.admins || []);
        if (auditResponse.ok) setAuditLogs(auditData.items || []);
      }
      setStatus(meData.admin?.mustChangePassword ? "change-password" : "ready");
    } catch (error) {
      if (!silent) setStatus("error");
      setMessage(error.message);
    }
  }, [salesSearch, leadSearch, leadStatus]);

  const login = async (event) => {
    event.preventDefault();
    setAuthSubmitting(true);
    setMessage("");
    try {
      const response = await fetch(`${CRM_ENDPOINT}/admin/login`, { method: "POST", headers: { "content-type": "application/json", "x-admin-password": loginForm.password }, body: JSON.stringify(loginForm) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "管理员登录失败。");
      setAdminToken(result.token);
      setAdmin(result.admin);
      await load(result.token);
    } catch (error) { setStatus("login"); setMessage(error.message); }
    finally { setAuthSubmitting(false); }
  };

  const changeAdminPassword = async (event) => {
    event.preventDefault();
    const response = await fetch(`${CRM_ENDPOINT}/admin/change-password`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${adminToken}` }, body: JSON.stringify(passwordForm) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setMessage(result.message || "密码修改失败。"); return; }
    setPasswordForm({ currentPassword: "", nextPassword: "" });
    setShowPasswordChange(false);
    await load(adminToken);
    setMessage("管理员密码已更新。");
  };

  const adminRequest = async (path, options = {}) => {
    const response = await fetch(`${CRM_ENDPOINT}${path}`, { ...options, headers: { ...(options.headers || {}), authorization: `Bearer ${adminToken}` } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || "操作失败。");
    return result;
  };

  const loadMoreSales = async () => {
    if (!salesNextCursor) return;
    const params = new URLSearchParams({ page_size: "100", cursor: salesNextCursor });
    if (salesSearch.trim()) params.set("q", salesSearch.trim());
    const result = await adminRequest(`/admin/sales?${params}`);
    setSales((current) => [...current, ...(result.sales || [])]);
    setSalesNextCursor(result.next_cursor || null);
  };

  const loadMoreLeads = async () => {
    if (!leadsNextCursor) return;
    const params = new URLSearchParams({ page_size: "100", cursor: leadsNextCursor });
    if (leadSearch.trim()) params.set("q", leadSearch.trim());
    if (leadStatus) params.set("status", leadStatus);
    const result = await adminRequest(`/admin/leads?${params}`);
    setLeads((current) => [...current, ...(result.leads || [])]);
    setLeadsNextCursor(result.next_cursor || null);
  };

  const createNamedAdmin = async (event) => {
    event.preventDefault();
    setMessage("");
    try {
      await adminRequest("/admin/admins", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(newAdmin) });
      setNewAdmin({ displayName: "", loginPhone: "", role: "viewer", password: "" });
      await load(adminToken, { silent: true });
      setMessage("具名管理员账号已创建。");
    } catch (error) { setMessage(error.message); }
  };

  const changeSalesStatus = async (person) => {
    const reason = globalThis.prompt(`请填写${person.active ? "停用" : "恢复"}${person.display_name}的原因：`);
    if (!reason) return;
    try {
      await adminRequest(`/admin/sales/${person.id}/status`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ active: !person.active, reason }) });
      await load(adminToken, { silent: true });
      setMessage(`已${person.active ? "停用" : "恢复"}${person.display_name}。`);
    } catch (error) { setMessage(error.message); }
  };

  const changeSalesPhone = async (person) => {
    const loginPhone = globalThis.prompt(`请输入${person.display_name}的新登录手机号：`, /^1[3-9]\d{9}$/.test(person.login_name) ? person.login_name : "");
    if (!loginPhone) return;
    const reason = globalThis.prompt("请填写修改手机号的原因：");
    if (!reason) return;
    try {
      await adminRequest(`/admin/sales/${person.id}/phone`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ loginPhone, reason }) });
      await load(adminToken, { silent: true });
      setMessage("销售登录手机号已更新。");
    } catch (error) { setMessage(error.message); }
  };

  const resetSalesPassword = async (person) => {
    const password = globalThis.prompt(`请输入${person.display_name}的新临时密码（至少10位）：`);
    if (!password) return;
    const reason = globalThis.prompt("请填写重置密码的原因：");
    if (!reason) return;
    try {
      await adminRequest(`/admin/sales/${person.id}/reset-password`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password, reason }) });
      setMessage("临时密码已设置，销售下次登录必须修改密码。");
    } catch (error) { setMessage(error.message); }
  };

  const createSales = async (event) => {
    event.preventDefault();
    setMessage("");
    try {
      const response = await fetch(`${CRM_ENDPOINT}/admin/sales`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${adminToken}` }, body: JSON.stringify(newSales) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "销售账号创建失败。");
      setNewSales({ displayName: "", loginName: "", inviteCode: "", password: "" });
      setMessage(`已创建 ${result.sales.displayName}，邀请码：${result.sales.inviteCode}`);
      await load(adminToken, { silent: true });
    } catch (error) {
      setMessage(error.message);
    }
  };

  const assignLead = async (leadId) => {
    const draft = assignments[leadId] || {};
    setMessage("");
    try {
      const response = await fetch(`${CRM_ENDPOINT}/admin/leads/${leadId}/assign`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${adminToken}` }, body: JSON.stringify({ salesId: Number(draft.salesId), reason: draft.reason || "管理员分配" }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "客户分配失败。");
      await load(adminToken, { silent: true });
    } catch (error) {
      setMessage(error.message);
    }
  };

  const batchAssign = async () => {
    if (!selectedLeadIds.length) { setMessage("请先勾选客户。"); return; }
    try {
      const result = await adminRequest("/admin/leads/batch-assign", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ customerIds: selectedLeadIds, salesId: Number(batchAssignment.salesId), reason: batchAssignment.reason }) });
      setSelectedLeadIds([]);
      setBatchAssignment({ salesId: "", reason: "" });
      await load(adminToken, { silent: true });
      setMessage(`批量分配完成：${result.updated} 位客户。`);
    } catch (error) { setMessage(error.message); }
  };

  const previewImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 1_048_576) { setMessage("CSV 文件不能超过 1 MB。"); return; }
    const rows = parseCsv(await file.text()).slice(0, 500);
    try {
      const result = await adminRequest("/admin/imports/customers", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "preview", filename: file.name, rows }) });
      setImportState({ filename: file.name, rows, preview: result.preview || [], summary: result.summary || null });
      setMessage("导入预览已生成，请确认后执行。");
    } catch (error) { setMessage(error.message); }
  };

  const commitImport = async () => {
    try {
      const result = await adminRequest("/admin/imports/customers", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "commit", filename: importState.filename, rows: importState.rows }) });
      setImportState({ filename: "", rows: [], preview: [], summary: null });
      await load(adminToken, { silent: true });
      setMessage(`导入完成：新增 ${result.imported} 位客户，冲突数据已跳过。`);
    } catch (error) { setMessage(error.message); }
  };

  const mergeSelectedLeads = async () => {
    const masterId = Number(mergeState.masterId);
    const duplicateIds = selectedLeadIds.filter((id) => id !== masterId);
    if (!masterId || !duplicateIds.length || !mergeState.reason) { setMessage("请选择至少两位同手机号客户、主客户并填写合并原因。"); return; }
    if (!globalThis.confirm("客户合并后重复记录将被软合并并从列表隐藏，是否确认？")) return;
    try {
      const result = await adminRequest("/admin/leads/merge", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ masterId, duplicateIds, reason: mergeState.reason }) });
      setSelectedLeadIds([]);
      setMergeState({ masterId: "", reason: "" });
      await load(adminToken, { silent: true });
      setMessage(`已合并 ${result.merged} 条重复客户记录。`);
    } catch (error) { setMessage(error.message); }
  };

  const normalizedSalesSearch = salesSearch.trim().toLowerCase();
  const filteredSales = sales.filter((person) => !normalizedSalesSearch
    || person.display_name.toLowerCase().includes(normalizedSalesSearch)
    || person.login_name.toLowerCase().includes(normalizedSalesSearch));
  const normalizedLeadSearch = leadSearch.trim().toLowerCase();
  const filteredLeads = leads.filter((lead) => (!normalizedLeadSearch
    || lead.name.toLowerCase().includes(normalizedLeadSearch)
    || lead.phone.includes(normalizedLeadSearch)) && (!leadStatus || lead.status === leadStatus));
  const normalizedAssignmentSearch = assignmentSalesSearch.trim().toLowerCase();
  const assignableSales = sales.filter((person) => person.active && (!normalizedAssignmentSearch
    || person.display_name.toLowerCase().includes(normalizedAssignmentSearch)
    || person.login_name.toLowerCase().includes(normalizedAssignmentSearch)));

  const downloadAdminCsv = async (type) => {
    setMessage("");
    const params = new URLSearchParams();
    if (type === "sales" && salesSearch.trim()) params.set("q", salesSearch.trim());
    if (type === "leads" && leadSearch.trim()) params.set("q", leadSearch.trim());
    if (type === "leads" && leadStatus) params.set("status", leadStatus);
    const response = await fetch(`${CRM_ENDPOINT}/admin/exports/${type}.csv?${params}`, { headers: { authorization: `Bearer ${adminToken}` } });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setMessage(result.message || "CSV 下载失败。");
      return;
    }
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = `卓能河畔轩-${type === "sales" ? "销售账号" : "客户归属"}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  };
  const exportSales = () => downloadAdminCsv("sales");
  const exportLeads = () => downloadAdminCsv("leads");

  if (["checking", "loading"].includes(status)) return <main className="admin-login-page"><section className="admin-login-card"><p>CHEUK NANG RIVERSIDE</p><h1>CRM 管理后台</h1><span>正在安全连接具名管理员系统。</span><div className="admin-loading">正在连接 CRM 数据库…</div></section></main>;

  if (status === "change-password") {
    return <main className="admin-login-page"><section className="admin-login-card"><p>SECURITY UPDATE</p><h1>修改临时密码</h1><span>首次登录或密码重置后，必须设置新的管理员密码。</span><form onSubmit={changeAdminPassword}><label><span>当前临时密码</span><input type="password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} required /></label><label><span>新密码</span><input type="password" minLength="10" value={passwordForm.nextPassword} onChange={(event) => setPasswordForm({ ...passwordForm, nextPassword: event.target.value })} required /></label>{message && <strong role="alert">{message}</strong>}<button type="submit">更新密码</button></form></section></main>;
  }

  if (["login", "error"].includes(status)) {
    return <main className="admin-login-page"><section className="admin-login-card"><p>CHEUK NANG RIVERSIDE</p><h1>CRM 管理后台</h1><span>超级管理员使用 admin 登录；其他具名管理员使用手机号登录。</span><form onSubmit={login}><label><span>管理员账号</span><input value={loginForm.loginName} onChange={(event) => setLoginForm({ ...loginForm, loginName: event.target.value.trim().slice(0, 48) })} autoComplete="username" required autoFocus /></label><label><span>管理员密码</span><input type="password" value={loginForm.password} onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })} autoComplete="current-password" required /></label>{message && <strong role="alert">{message}</strong>}<button type="submit" disabled={authSubmitting}>{authSubmitting ? "正在登录" : "进入 CRM"}</button></form></section></main>;
  }

  const salesView = (
    <section className="crm-panel crm-admin-view">
      <div className="crm-view-header"><div><p>SALES ACCOUNTS</p><h2>创建销售账号</h2><span>新账号统一使用中国大陆手机号登录；历史账号暂保留原登录名。</span></div>{admin?.permissions?.some((permission) => ["export_full", "export_masked"].includes(permission)) && <button type="button" onClick={exportSales}>下载销售 CSV</button>}</div>
      <div className="crm-filter-bar"><input type="search" value={salesSearch} onChange={(event) => setSalesSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") load(adminToken, { silent: true }); }} placeholder="搜索销售姓名或登录手机号" /><button type="button" onClick={() => load(adminToken, { silent: true })}>搜索</button><span>共 {salesTotal} 位销售</span></div>
      {admin?.permissions?.includes("sales_manage") && <form className="crm-form" onSubmit={createSales}><input value={newSales.displayName} onChange={(event) => setNewSales({ ...newSales, displayName: event.target.value })} placeholder="销售姓名" required /><input type="tel" inputMode="numeric" pattern="1[3-9][0-9]{9}" maxLength="11" value={newSales.loginName} onChange={(event) => setNewSales({ ...newSales, loginName: event.target.value.replace(/\D/g, "").slice(0, 11) })} placeholder="登录手机号" required /><input value={newSales.inviteCode} onChange={(event) => setNewSales({ ...newSales, inviteCode: event.target.value })} placeholder="邀请码（留空自动生成）" /><input type="password" value={newSales.password} onChange={(event) => setNewSales({ ...newSales, password: event.target.value })} placeholder="初始密码，至少 10 位" required /><button type="submit">创建账号</button></form>}
      <div className="admin-table-wrap"><table className="crm-sales-table"><thead><tr><th>销售</th><th>登录手机号／历史登录名</th><th>邀请码</th><th>状态</th><th>官方邀请链接</th><th>账号操作</th></tr></thead><tbody>{filteredSales.length ? filteredSales.map((person) => <tr key={person.id}><td>{person.display_name}</td><td>{person.login_name}</td><td>{person.invite_code}</td><td>{person.active ? "启用" : "停用"}{person.must_change_password ? " · 待改密" : ""}</td><td><code>{person.invite_url || "待配置邀请签名密钥"}</code></td><td>{admin?.permissions?.includes("sales_manage") ? <div className="crm-row-actions"><button type="button" onClick={() => changeSalesStatus(person)}>{person.active ? "停用" : "恢复"}</button><button type="button" onClick={() => changeSalesPhone(person)}>改手机号</button><button type="button" onClick={() => resetSalesPassword(person)}>重置密码</button></div> : "—"}</td></tr>) : <tr><td colSpan="6" className="crm-table-empty">没有匹配的销售账号</td></tr>}</tbody></table></div>{salesNextCursor && <button className="crm-load-more" type="button" onClick={loadMoreSales}>加载更多销售</button>}
      {admin?.permissions?.includes("admin_manage") && <section className="crm-subsection"><div className="crm-subsection-heading"><div><p>ADMIN ACCOUNTS</p><h2>具名管理员</h2></div></div><form className="crm-form crm-admin-form" onSubmit={createNamedAdmin}><input value={newAdmin.displayName} onChange={(event) => setNewAdmin({ ...newAdmin, displayName: event.target.value })} placeholder="管理员姓名" required /><input type="tel" inputMode="numeric" value={newAdmin.loginPhone} onChange={(event) => setNewAdmin({ ...newAdmin, loginPhone: event.target.value.replace(/\D/g, "").slice(0, 11) })} placeholder="登录手机号" required /><select value={newAdmin.role} onChange={(event) => setNewAdmin({ ...newAdmin, role: event.target.value })}><option value="viewer">只读 viewer</option><option value="operator">运营 operator</option><option value="super_admin">超级管理员</option></select><input type="password" minLength="10" value={newAdmin.password} onChange={(event) => setNewAdmin({ ...newAdmin, password: event.target.value })} placeholder="临时密码，至少10位" required /><button type="submit">创建管理员</button></form><div className="admin-table-wrap"><table><thead><tr><th>管理员</th><th>手机号</th><th>角色</th><th>状态</th><th>最近登录</th></tr></thead><tbody>{admins.map((person) => <tr key={person.id}><td>{person.display_name}</td><td>{person.login_phone}</td><td>{person.role}</td><td>{person.active ? "启用" : "停用"}</td><td>{person.last_login_at || "尚未登录"}</td></tr>)}</tbody></table></div></section>}
      {admin?.permissions?.includes("audit") && <section className="crm-subsection"><div className="crm-subsection-heading"><div><p>AUDIT LOG</p><h2>最近管理操作</h2></div></div><div className="admin-table-wrap"><table><thead><tr><th>时间</th><th>管理员</th><th>操作</th><th>原因</th><th>请求编号</th></tr></thead><tbody>{auditLogs.map((log) => <tr key={log.id}><td>{log.created_at}</td><td>{log.admin_name || log.actor_type}</td><td>{log.action}</td><td>{log.reason || "—"}</td><td><code>{log.request_id}</code></td></tr>)}</tbody></table></div></section>}
    </section>
  );

  const leadsView = (
    <section className="crm-panel crm-admin-view crm-admin-leads-panel">
      <div className="crm-view-header"><div><p>LEAD OWNERSHIP</p><h2>客户归属与公共池</h2><span>搜索客户并将其分配或转交给指定销售。</span></div>{admin?.permissions?.some((permission) => ["export_full", "export_masked"].includes(permission)) && <button type="button" onClick={exportLeads}>下载客户 CSV</button>}</div>
      <div className="crm-filter-bar crm-lead-filters"><input type="search" value={leadSearch} onChange={(event) => setLeadSearch(event.target.value)} placeholder="搜索客户姓名或手机号" /><select value={leadStatus} onChange={(event) => setLeadStatus(event.target.value)}><option value="">全部客户状态</option>{crmStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><input type="search" value={assignmentSalesSearch} onChange={(event) => setAssignmentSalesSearch(event.target.value)} placeholder="搜索可分配销售姓名或手机号" /><button type="button" onClick={() => load(adminToken, { silent: true })}>搜索客户</button><span>共 {leadsTotal} 位客户</span></div>
      {admin?.permissions?.includes("lead_assign") && selectedLeadIds.length > 0 && <div className="crm-batch-bar"><strong>已选 {selectedLeadIds.length} 位客户</strong><select value={batchAssignment.salesId} onChange={(event) => setBatchAssignment({ ...batchAssignment, salesId: event.target.value })}><option value="">目标销售</option>{sales.filter((person) => person.active).map((person) => <option key={person.id} value={person.id}>{person.display_name} · {person.login_name}</option>)}</select><input value={batchAssignment.reason} onChange={(event) => setBatchAssignment({ ...batchAssignment, reason: event.target.value })} placeholder="批量分配原因" /><button type="button" onClick={batchAssign}>批量分配</button>{admin?.permissions?.includes("lead_merge") && <><select value={mergeState.masterId} onChange={(event) => setMergeState({ ...mergeState, masterId: event.target.value })}><option value="">选择主客户</option>{selectedLeadIds.map((id) => { const lead = leads.find((item) => item.id === id); return <option key={id} value={id}>{lead?.name} · {lead?.phone}</option>; })}</select><input value={mergeState.reason} onChange={(event) => setMergeState({ ...mergeState, reason: event.target.value })} placeholder="客户合并原因" /><button type="button" onClick={mergeSelectedLeads}>合并重复客户</button></>}</div>}
      {admin?.permissions?.includes("import") && <div className="crm-import-panel"><label><span>批量导入客户 CSV</span><input type="file" accept=".csv,text/csv" onChange={previewImport} /></label>{importState.summary && <div><strong>预览：新增 {importState.summary.insert}，跳过 {importState.summary.skip}，错误 {importState.summary.error}</strong><button type="button" onClick={commitImport} disabled={!importState.summary.insert}>确认导入</button></div>}{importState.preview.length > 0 && <details><summary>查看逐行校验结果</summary><div className="admin-table-wrap"><table><thead><tr><th>行号</th><th>客户</th><th>手机号</th><th>处理</th><th>说明</th></tr></thead><tbody>{importState.preview.slice(0, 50).map((row) => <tr key={row.index}><td>{row.index}</td><td>{row.name || "—"}</td><td>{row.phone || "—"}</td><td>{row.action}</td><td>{row.errors.join("；") || "可导入"}</td></tr>)}</tbody></table></div></details>}</div>}
      <div className="admin-table-wrap"><table className="crm-admin-leads-table"><thead><tr><th><input type="checkbox" aria-label="选择当前页全部客户" checked={filteredLeads.length > 0 && filteredLeads.every((lead) => selectedLeadIds.includes(lead.id))} onChange={(event) => setSelectedLeadIds(event.target.checked ? filteredLeads.map((lead) => lead.id) : [])} /></th><th>客户</th><th>手机号</th><th>状态</th><th>当前归属</th><th>分配／转交</th></tr></thead><tbody>{filteredLeads.length ? filteredLeads.map((lead) => { const selectedSalesId = Number(assignments[lead.id]?.salesId || 0); const salesOptions = sales.filter((person) => person.active && (assignableSales.some((match) => match.id === person.id) || person.id === selectedSalesId)); return <tr key={lead.id}><td><input type="checkbox" aria-label={`选择客户 ${lead.name}`} checked={selectedLeadIds.includes(lead.id)} onChange={(event) => setSelectedLeadIds(event.target.checked ? [...selectedLeadIds, lead.id] : selectedLeadIds.filter((id) => id !== lead.id))} /></td><td>{lead.name}</td><td>{lead.phone}</td><td>{crmStatuses.find(([value]) => value === lead.status)?.[1] || lead.status}</td><td>{lead.sales_name || "公共客户池"}</td><td>{admin?.permissions?.includes("lead_assign") ? <div className="crm-assignment"><select value={assignments[lead.id]?.salesId || ""} onChange={(event) => setAssignments({ ...assignments, [lead.id]: { ...assignments[lead.id], salesId: event.target.value } })}><option value="">{salesOptions.length ? "选择销售" : "无匹配销售"}</option>{salesOptions.map((person) => <option key={person.id} value={person.id}>{person.display_name} · {person.login_name}</option>)}</select><input value={assignments[lead.id]?.reason || ""} onChange={(event) => setAssignments({ ...assignments, [lead.id]: { ...assignments[lead.id], reason: event.target.value } })} placeholder="调整原因" /><button type="button" onClick={() => assignLead(lead.id)}>确认</button></div> : "无修改权限"}</td></tr>; }) : <tr><td colSpan="6" className="crm-table-empty">没有匹配的客户</td></tr>}</tbody></table></div>{leadsNextCursor && <button className="crm-load-more" type="button" onClick={loadMoreLeads}>加载更多客户</button>}
    </section>
  );

  return (
    <main className="admin-page">
      <header className="admin-topbar"><Brand light /><button type="button" onClick={() => { setAdminToken(""); setAdmin(null); setStatus("login"); }}>退出登录</button></header>
      <section className="admin-shell crm-admin-shell">
        <div className="admin-heading"><div><p>CRM ADMIN · {admin?.role}</p><h1>销售与客户归属</h1><span>{admin?.displayName}，邀请码只记录客户来源；销售登录后只能查看自己名下客户。</span></div><div className="admin-actions"><button type="button" onClick={() => setShowPasswordChange(true)}>修改密码</button><button type="button" onClick={() => load(adminToken, { silent: true })}>刷新</button></div></div>
        {message && <p className="crm-message" role="status">{message}</p>}
        <div className="crm-admin-workspace">
          <aside className="crm-admin-nav" aria-label="CRM 管理页面">
            <button type="button" className={activeView === "sales" ? "is-active" : ""} onClick={() => setActiveView("sales")}><small>01</small><span>销售账号</span><strong>创建与查询</strong></button>
            <button type="button" className={activeView === "leads" ? "is-active" : ""} onClick={() => setActiveView("leads")}><small>02</small><span>客户归属</span><strong>公共池与转交</strong></button>
          </aside>
          <div className="crm-admin-content">{activeView === "sales" ? salesView : leadsView}</div>
        </div>
      </section>
      {showPasswordChange && <div className="crm-timeline-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowPasswordChange(false); }}><section className="admin-login-card crm-password-card" role="dialog" aria-modal="true"><p>SECURITY UPDATE</p><h1>修改管理员密码</h1><span>修改后请使用新密码登录；账号保持不变。</span><form onSubmit={changeAdminPassword}><label><span>当前密码</span><input type="password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} required /></label><label><span>新密码</span><input type="password" minLength="10" value={passwordForm.nextPassword} onChange={(event) => setPasswordForm({ ...passwordForm, nextPassword: event.target.value })} required /></label>{message && <strong role="alert">{message}</strong>}<div className="crm-password-actions"><button type="button" onClick={() => setShowPasswordChange(false)}>取消</button><button type="submit">确认修改</button></div></form></section></div>}
    </main>
  );
}

function SalesCrm() {
  const [status, setStatus] = useState("login");
  const [loginName, setLoginName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [sales, setSales] = useState(null);
  const [leads, setLeads] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [salesToken, setSalesToken] = useState("");
  const [qrCardUrl, setQrCardUrl] = useState("");
  const [qrMessage, setQrMessage] = useState("");
  const [savingLeadId, setSavingLeadId] = useState(null);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", nextPassword: "" });
  const [reminderFilter, setReminderFilter] = useState("");
  const [leadSearch, setLeadSearch] = useState("");
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [leadsNextCursor, setLeadsNextCursor] = useState(null);
  const [timeline, setTimeline] = useState({ lead: null, items: [], nextCursor: null });

  const load = useCallback(async (token, { silent = false } = {}) => {
    if (!token) { setStatus("login"); return; }
    if (!silent) {
      setStatus("loading");
      setMessage("");
    }
    try {
      const headers = { authorization: `Bearer ${token}` };
      const params = new URLSearchParams({ page_size: "100" });
      if (reminderFilter) params.set("reminder", reminderFilter);
      if (leadSearch.trim()) params.set("q", leadSearch.trim());
      const [meResponse, leadsResponse] = await Promise.all([fetch(`${CRM_ENDPOINT}/me`, { headers }), fetch(`${CRM_ENDPOINT}/leads?${params}`, { headers })]);
      if (meResponse.status === 401 || leadsResponse.status === 401) { setStatus("login"); return; }
      const me = await meResponse.json().catch(() => ({}));
      const data = await leadsResponse.json().catch(() => ({}));
      if (!meResponse.ok) throw new Error(me.message || "销售账号加载失败。");
      if (!leadsResponse.ok) throw new Error(data.message || "客户列表加载失败。");
      setSales(me.sales);
      const nextLeads = data.leads || [];
      setLeads(nextLeads);
      setLeadsTotal(Number(data.total || 0));
      setLeadsNextCursor(data.next_cursor || null);
      setDrafts(Object.fromEntries(nextLeads.map((lead) => [lead.id, { status: lead.status, note: lead.latest_note || "", nextFollowupAt: lead.next_followup_at ? lead.next_followup_at.replace(" ", "T").slice(0, 16) : "" }])));
      setStatus(me.sales?.mustChangePassword ? "change-password" : "ready");
    } catch (error) {
      if (!silent) setStatus("error");
      setMessage(error.message);
    }
  }, [reminderFilter, leadSearch]);

  useEffect(() => {
    let cancelled = false;
    if (!sales?.inviteUrl) { setQrCardUrl(""); return undefined; }
    setQrMessage("正在生成专属二维码…");
    createInviteQrCard({ displayName: sales.displayName, inviteUrl: sales.inviteUrl })
      .then((url) => { if (!cancelled) { setQrCardUrl(url); setQrMessage(""); } })
      .catch((error) => { if (!cancelled) setQrMessage(error.message); });
    return () => { cancelled = true; };
  }, [sales]);

  const login = async (event) => {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");
    try {
      const response = await fetch(`${CRM_ENDPOINT}/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ loginName, password }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "登录失败。");
      setPassword("");
      setSalesToken(result.token);
      if (result.sales?.mustChangePassword) {
        setSales(result.sales);
        setStatus("change-password");
      } else await load(result.token);
    } catch (error) { setStatus("login"); setMessage(error.message); }
  };

  const changeSalesPassword = async (event) => {
    event.preventDefault();
    const response = await fetch(`${CRM_ENDPOINT}/change-password`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${salesToken}` }, body: JSON.stringify(passwordForm) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setMessage(result.message || "密码修改失败。"); return; }
    setPasswordForm({ currentPassword: "", nextPassword: "" });
    await load(salesToken);
    setMessage("密码已更新。");
  };

  const loadMoreSalesLeads = async () => {
    if (!leadsNextCursor) return;
    const params = new URLSearchParams({ page_size: "100", cursor: leadsNextCursor });
    if (reminderFilter) params.set("reminder", reminderFilter);
    if (leadSearch.trim()) params.set("q", leadSearch.trim());
    const response = await fetch(`${CRM_ENDPOINT}/leads?${params}`, { headers: { authorization: `Bearer ${salesToken}` } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setMessage(result.message || "更多客户加载失败。"); return; }
    setLeads((current) => [...current, ...(result.leads || [])]);
    setLeadsNextCursor(result.next_cursor || null);
  };

  const openTimeline = async (lead, cursor = "") => {
    const response = await fetch(`${CRM_ENDPOINT}/leads/${lead.id}/followups${cursor ? `?cursor=${cursor}` : ""}`, { headers: { authorization: `Bearer ${salesToken}` } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setMessage(result.message || "跟进历史加载失败。"); return; }
    setTimeline((current) => ({ lead, items: cursor ? [...current.items, ...(result.items || [])] : result.items || [], nextCursor: result.nextCursor || null }));
  };

  const saveFollowup = async (lead) => {
    const draft = drafts[lead.id] || { status: lead.status, note: "" };
    if (savingLeadId === lead.id) return;
    if (!draft.note.trim()) { setMessage("请先填写跟进备注。"); return; }
    setSavingLeadId(lead.id);
    setMessage("");
    try {
      const response = await fetch(`${CRM_ENDPOINT}/leads/${lead.id}`, { method: "PATCH", headers: { "content-type": "application/json", authorization: `Bearer ${salesToken}` }, body: JSON.stringify(draft) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "跟进保存失败。");
      await load(salesToken, { silent: true });
      setMessage("跟进已保存，备注已同步。");
    } catch (error) { setMessage(error.message); }
    finally { setSavingLeadId(null); }
  };

  const downloadQrCard = () => {
    if (!qrCardUrl || !sales) return;
    const link = document.createElement("a");
    link.href = qrCardUrl;
    link.download = `卓能河畔轩-${sales.displayName}-专属邀约二维码.png`;
    document.body.append(link);
    link.click();
    link.remove();
  };

  if (status === "change-password") return <main className="admin-login-page"><section className="admin-login-card"><p>SECURITY UPDATE</p><h1>修改临时密码</h1><span>管理员重置密码后，首次登录必须设置新密码。</span><form onSubmit={changeSalesPassword}><label><span>当前临时密码</span><input type="password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} required /></label><label><span>新密码</span><input type="password" minLength="10" value={passwordForm.nextPassword} onChange={(event) => setPasswordForm({ ...passwordForm, nextPassword: event.target.value })} required /></label>{message && <strong role="alert">{message}</strong>}<button type="submit">更新密码</button></form></section></main>;

  if (["loading", "login", "submitting", "error"].includes(status)) {
    return <main className="admin-login-page"><section className="admin-login-card"><p>CHEUK NANG RIVERSIDE</p><h1>销售客户后台</h1><span>仅展示分配给当前账号的客户；邀请码不能用于登录。</span>{status === "loading" ? <div className="admin-loading">正在连接 CRM 数据库…</div> : <form onSubmit={login}><label><span>登录手机号／历史登录名</span><input value={loginName} onChange={(event) => setLoginName(event.target.value)} autoComplete="username" required /></label><label><span>密码</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>{message && <strong role="alert">{message}</strong>}<button type="submit" disabled={status === "submitting"}>{status === "submitting" ? "正在登录" : "进入客户后台"}</button></form>}</section></main>;
  }

  return (
    <main className="admin-page">
      <header className="admin-topbar"><Brand light /><button type="button" onClick={() => { setSalesToken(""); setStatus("login"); }}>退出登录</button></header>
      <section className="admin-shell">
        <div className="admin-heading"><div><p>SALES CRM</p><h1>{sales?.displayName}的客户</h1><span>邀请码只用于识别来源，不可作为后台登录凭证。</span></div><div className="admin-actions"><button type="button" onClick={() => load(salesToken, { silent: true })}>刷新</button></div></div>
        <section className="crm-panel crm-qr-panel"><div><h2>我的官方专属二维码</h2><p>请将此二维码或官方专属链接分享给客户。客户扫码后提交资料，系统才会自动归属到你名下。</p>{sales?.inviteUrl ? <code>{sales.inviteUrl}</code> : <strong>邀请签名尚未配置，暂不能生成可用二维码。</strong>}<div className="admin-actions"><button type="button" onClick={downloadQrCard} disabled={!qrCardUrl}>下载专属二维码</button></div>{qrMessage && <p className="crm-message" role="status">{qrMessage}</p>}</div>{qrCardUrl && <img src={qrCardUrl} alt={`${sales.displayName}的卓能河畔轩官方专属二维码`} />}</section>
        {message && <p className="crm-message" role="status">{message}</p>}
        <section className="crm-panel crm-leads-panel">
          <div className="crm-leads-heading"><div><p>MY CLIENTS</p><h2>客户跟进</h2></div><span>共 {leadsTotal} 位客户</span></div>
          <div className="crm-filter-bar crm-sales-lead-filters"><input type="search" value={leadSearch} onChange={(event) => setLeadSearch(event.target.value)} placeholder="搜索客户姓名或手机号" /><select value={reminderFilter} onChange={(event) => setReminderFilter(event.target.value)}><option value="">全部提醒</option><option value="overdue">已逾期</option><option value="today">今天待跟进</option><option value="week">未来7天</option><option value="none">暂无计划</option></select><button type="button" onClick={() => load(salesToken, { silent: true })}>搜索</button></div>
          {leads.length ? <div className="crm-leads-grid">{leads.map((lead) => { const draft = drafts[lead.id] || { status: lead.status, note: lead.latest_note || "", nextFollowupAt: "" }; const currentStatus = crmStatuses.find(([value]) => value === lead.status)?.[1] || lead.status; const isSaving = savingLeadId === lead.id; return <article className="crm-lead-card" key={lead.id} aria-busy={isSaving}><header><div><small>客户</small><h3>{lead.name}</h3></div><a href={`tel:${lead.phone}`}>{lead.phone}</a></header><div className="crm-lead-summary"><span><small>当前状态</small><strong>{currentStatus}</strong></span><span><small>最近跟进</small><strong>{lead.last_followup_at || "暂无"}</strong></span></div><div className="crm-lead-controls"><label><span>跟进状态</span><select value={draft.status} onChange={(event) => setDrafts({ ...drafts, [lead.id]: { ...draft, status: event.target.value } })}>{crmStatuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span>下次跟进</span><input type="datetime-local" value={draft.nextFollowupAt} onChange={(event) => setDrafts({ ...drafts, [lead.id]: { ...draft, nextFollowupAt: event.target.value } })} /></label><label className="crm-lead-note"><span>跟进备注</span><textarea rows="4" value={draft.note} onChange={(event) => setDrafts({ ...drafts, [lead.id]: { ...draft, note: event.target.value } })} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.repeat && !event.nativeEvent.isComposing) { event.preventDefault(); saveFollowup(lead); } }} placeholder="填写备注后按回车自动保存" /><small>{isSaving ? "正在保存…" : "回车自动保存 · Shift+回车换行"}</small></label><button className="crm-timeline-button" type="button" onClick={() => openTimeline(lead)}>跟进历史</button></div></article>; })}</div> : <p className="crm-leads-empty">暂时还没有符合条件的客户。</p>}
          {leadsNextCursor && <button className="crm-load-more" type="button" onClick={loadMoreSalesLeads}>加载更多客户</button>}
        </section>
      </section>
      {timeline.lead && <div className="crm-timeline-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setTimeline({ lead: null, items: [], nextCursor: null }); }}><section className="crm-timeline" role="dialog" aria-modal="true"><header><div><small>FOLLOW-UP HISTORY</small><h2>{timeline.lead.name}的跟进历史</h2></div><button type="button" onClick={() => setTimeline({ lead: null, items: [], nextCursor: null })}>关闭</button></header>{timeline.items.length ? <ol>{timeline.items.map((item) => <li key={item.id}><time>{item.created_at}</time><strong>{item.sales_name || "销售"} · {crmStatuses.find(([value]) => value === item.status)?.[1] || item.status}</strong><p>{item.note}</p>{item.next_followup_at && <span>下次跟进：{item.next_followup_at}</span>}</li>)}</ol> : <p className="crm-leads-empty">暂无跟进记录</p>}{timeline.nextCursor && <button className="crm-load-more" type="button" onClick={() => openTimeline(timeline.lead, timeline.nextCursor)}>加载更多历史</button>}</section></div>}
    </main>
  );
}

function CrmHostRedirect() {
  useEffect(() => {
    const target = `${CRM_APP_ORIGIN}/${globalThis.location?.hash || "#/crm/admin"}`;
    if (globalThis.location?.origin !== CRM_APP_ORIGIN) globalThis.location.replace(target);
  }, []);
  return <main className="admin-login-page"><section className="admin-login-card"><p>CHEUK NANG RIVERSIDE</p><h1>正在进入 CRM</h1><span>为保护登录与客户数据，CRM 正在切换到官方安全后台入口。</span></section></main>;
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
    document.documentElement.lang = ACTIVE_LOCALE;
  }, []);

  useEffect(() => {
    const id = decodeURIComponent(globalThis.location?.hash.slice(1) || "");
    if (!id || id.startsWith("/")) return undefined;
    const frame = requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
    return () => cancelAnimationFrame(frame);
  }, []);

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
    const timer = window.setInterval(() => setScene((value) => (value + 1) % communityScenes.length), 6200);
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
        <small>PRIVATE VIEWING</small><span>{tr("预约参观")}</span><ArrowRight size={17} />
      </button>
      <main>
        <Hero />
        <Heritage />
        <Timeline />
        <GroupFootprint />
        <Project />
        <ProjectArchive />
        <HangzhouChapter />
        <Location />
        <ContextDetails />
        <Community active={scene} setActive={setScene} />
        <RenewalGallery />
        <SalesCentre />
        <Interiors />
        <Film />
        <Homes active={unit} setActive={setUnit} />
        <Benefits />
        <Contact onBooking={openBooking} />
      </main>
      <Footer />
      <BookingModal open={bookingOpen} onClose={closeBooking} />
      <LanguageSuggestion />
    </>
  );
}

export function App() {
  const isCrmRoute = globalThis.location?.hash.startsWith("#/crm/");
  if (RESERVATIONS_ENABLED && isCrmRoute && !import.meta.env.DEV && globalThis.location?.origin !== CRM_APP_ORIGIN) return <CrmHostRedirect />;
  if (RESERVATIONS_ENABLED && globalThis.location?.hash.startsWith("#/crm/admin")) return <CrmAdmin />;
  if (RESERVATIONS_ENABLED && globalThis.location?.hash.startsWith("#/crm/sales")) return <SalesCrm />;
  if (RESERVATIONS_ENABLED && (
    globalThis.location?.hostname === "records.cheuknangriverside.com"
    || globalThis.location?.hash.startsWith("#/admin/reservations")
  )) return <ReservationAdmin />;
  return <SiteApp />;
}
