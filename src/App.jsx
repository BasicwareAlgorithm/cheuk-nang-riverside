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
const RESERVATION_ENDPOINT = "/api/reservations";
const ADMIN_ENDPOINT = "/api/admin/reservations";
const PHONE_PATTERN = /^(?:\+?86[- ]?)?1[3-9]\d{9}$/;
const RESERVATIONS_ENABLED = import.meta.env.VITE_RESERVATIONS_ENABLED === "true";

function asset(path) {
  return globalThis.__OFFLINE_ASSETS__?.[path] ?? `${DEPLOY_BASE}${path}`;
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
        {RESERVATIONS_ENABLED ? (
          <button className="mobile-booking" type="button" onClick={() => { setOpen(false); onBooking(); }}>
            <span>09</span><strong>{tr("预约参观")}</strong><ArrowRight size={20} />
          </button>
        ) : (
          <a className="mobile-booking" href="tel:057186309988" onClick={() => setOpen(false)}>
            <span>09</span><strong>{tr("电话预约")}</strong><ArrowRight size={20} />
          </a>
        )}
        <LanguageSwitcher />
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero" id="top">
      <img className="hero-image" src={asset(`${PHASE2}/hero-aerial.jpg`)} alt={tr("卓能河畔轩改造效果图")} fetchPriority="high" />
      <div className="hero-veil" />
      <div className="hero-line hero-line-a" /><div className="hero-line hero-line-b" />
      <div className="hero-copy">
        <p className="hero-kicker">{tr("卓能集团 · 首献杭州")}</p>
        <h1><span>{tr("卓能")}</span><em>·</em><span>{tr("河畔轩")}</span></h1>
        <div className="hero-rule" />
        <h2>{tr("轻享杭州的丰盈生活")}</h2>
        <p className="hero-meta">{tr("临平崇贤 · 滨水生活 · 建面约65-138㎡多元户型")}</p>
        <span className="visual-status">{tr("项目改造效果图")}</span>
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
          <figure className="project-main"><img src={asset(`${PHASE2}/hero-aerial.jpg`)} alt={tr("卓能河畔轩整体改造效果图")} /><figcaption>{tr("整体改造效果图")}</figcaption></figure>
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
          {RESERVATIONS_ENABLED ? (
            <button className="contact-booking" type="button" onClick={onBooking}>
              <span>{tr("预约参观")}</span><ArrowRight size={18} />
            </button>
          ) : (
            <a className="contact-booking" href="tel:057186309988">
              <span>{tr("电话预约")}</span><ArrowRight size={18} />
            </a>
          )}
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
      {RESERVATIONS_ENABLED ? (
        <button className="booking-float" type="button" onClick={openBooking}>
          <small>PRIVATE VIEWING</small><span>{tr("预约参观")}</span><ArrowRight size={17} />
        </button>
      ) : (
        <a className="booking-float" href="tel:057186309988" aria-label={`${tr("电话预约")} 0571 8630 9988`}>
          <small>PRIVATE VIEWING</small><span>{tr("电话预约")}</span><ArrowRight size={17} />
        </a>
      )}
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
      {RESERVATIONS_ENABLED && <BookingModal open={bookingOpen} onClose={closeBooking} />}
      <LanguageSuggestion />
    </>
  );
}

export function App() {
  if (RESERVATIONS_ENABLED && (
    globalThis.location?.hostname === "records.cheuknangriverside.com"
    || globalThis.location?.hash.startsWith("#/admin/reservations")
  )) return <ReservationAdmin />;
  return <SiteApp />;
}
