import OpenCC from "opencc-js";

export const SITE_ORIGIN = "https://www.cheuknangriverside.com";

const english = {
  "品牌": "Heritage",
  "项目": "Project",
  "区位": "Location",
  "生活": "Lifestyle",
  "影像": "Film",
  "户型": "Homes",
  "资讯": "Insights",
  "联系": "Contact",
  "品鉴热线": "Enquiries",
  "主导航": "Primary navigation",
  "关闭导航": "Close navigation",
  "打开导航": "Open navigation",
  "预约参观": "Book a Viewing",
  "卓能河畔轩首页": "Cheuk Nang Riverside home",
  "卓能·河畔轩": "Cheuk Nang Riverside",
  "卓能河畔轩水岸实景": "Riverside setting at Cheuk Nang Riverside",
  "卓能集团 · 首献杭州": "Cheuk Nang Group · Hangzhou Debut",
  "卓能": "Cheuk Nang",
  "河畔轩": "Riverside",
  "轻享杭州的丰盈生活": "A richer way of living in Hangzhou",
  "临平崇贤 · 地铁口 · 公园旁 · 建面约65-138㎡百万级实景现房": "Chongxian, Linping · Near metro and parks · Completed homes of approx. 65–138 sq m",
  "山水环抱": "Nature All Around",
  "葱郁山景与清澈河道温柔相拥，城市繁华与自然静谧在此交融。": "Green hills and clear waterways frame a calm home where urban convenience meets nature.",
  "临水而居": "Life by the Water",
  "与石塘公园隔河相望，坐享滨河绿道景观，让生活回到水岸的从容尺度。": "Across from Shitang Park, the riverside greenway brings an unhurried rhythm to everyday life.",
  "俯瞰一城": "Panoramic Outlook",
  "板块制高点，俯瞰山水公园与江南流水，云端栖居，繁华静谧尽揽怀中。": "An elevated outlook takes in parks, waterways and the city beyond, balancing energy with calm.",
  "温馨满屋": "Warm Interiors",
  "港式怀旧风小户型，温馨居家设计，方寸之间尽享烟火温情与精致生活。": "Compact homes with a nostalgic Hong Kong character create warm, refined spaces for daily life.",
  "拾光": "Shiguang",
  "拾屿": "Shiyu",
  "澜岸": "Lan'an",
  "澜轩": "Lanxuan",
  "一室两厅一卫": "1 bedroom · 2 living areas · 1 bathroom",
  "两室两厅一卫": "2 bedrooms · 2 living areas · 1 bathroom",
  "三室两厅一卫": "3 bedrooms · 2 living areas · 1 bathroom",
  "三室两厅两卫": "3 bedrooms · 2 living areas · 2 bathrooms",
  "通透格局": "Open layout", "客餐一体": "Integrated living and dining", "独立角厨": "Separate corner kitchen", "飘窗主卧": "Bay-window primary bedroom",
  "全明空间": "Naturally lit rooms", "科学布局": "Efficient planning", "阔绰通厅": "Generous living space", "南向主卧": "South-facing primary bedroom",
  "规整格局": "Well-proportioned plan", "一体通厅": "Connected living and dining", "飘景主卧": "Primary bedroom with a view", "独立明厨": "Separate windowed kitchen",
  "独立玄关": "Private entrance foyer", "全能三房": "Versatile three-bedroom plan", "观景阔厅": "Wide living room with views", "南北双阳台": "North and south balconies",
  "卓能集团香港物业实景": "Cheuk Nang Group property in Hong Kong",
  "实力港企 卓能集团首献杭州": "A Hong Kong Legacy, Debuting in Hangzhou",
  "卓能集团拥有逾60载深厚企业底蕴。1973年，集团商务体系于香港有限公司成立；从香港到内地，始终秉承“慎思力先”的理念。": "With more than six decades of experience, Cheuk Nang Group has grown from Hong Kong to Mainland China while remaining guided by thoughtful, disciplined development.",
  "载企业底蕴": "years of heritage", "港交所上市": "listed in Hong Kong", "大市场布局": "key markets",
  "大城北崛起": "North Hangzhou Rising", "崇贤正当时": "Chongxian's Moment",
  "你在杭州的第一个家": "Your first home in Hangzhou",
  "项目位于杭州临平区崇贤板块核心，踞守绕城内稀缺价格洼地。地铁、商业、教育、医疗与山水生态环伺，以主城级配套和亲民门槛，打造品质生活新标杆。": "Set in the heart of Chongxian, Linping, the project brings transport, retail, education, healthcare and waterside scenery together at an accessible entry point.",
  "万㎡": " sq m", "个": " spaces", "项目总建筑面积": "total gross floor area", "规划车位": "planned parking spaces", "盛景弯邸 首开在即": "Building 5 collection",
  "观看项目影片": "Watch the project film", "项目航拍实景": "Project aerial view", "卓能河畔轩社区航拍实景": "Aerial view of Cheuk Nang Riverside", "卓能河畔轩建筑实景": "Completed architecture at Cheuk Nang Riverside",
  "杭州城市与水系航拍": "Aerial view of Hangzhou and its waterways", "纵享": "Enjoy", "杭州": "Hangzhou", "丰盈": "Abundance", "大城丰盈 · 尽享暮景\n千亿大城北，崇贤新城乘势而上": "A vibrant city · A composed outlook\nNorth Hangzhou grows, and Chongxian moves forward",
  "多维路网 通达全城": "Connected to the Whole City",
  "邻立拱墅，全维配套触手可及；一城繁华与自然资源，在日常半径内从容抵达。": "Beside Gongshu, urban amenities and natural landscapes are within an easy everyday radius.",
  "卓能河畔轩区位与城市配套图": "Cheuk Nang Riverside location and amenities map",
  "约400m直线距离": "Approx. 400 m straight-line distance", "地铁15号线站口": "Metro Line 15 station", "约30分钟直达杭州东，串联运河新城、钱江新城与钱江世纪城。": "A planned connection linking Canal New City, Qianjiang New City and Qianjiang Century City.",
  "约700m直线距离": "Approx. 700 m straight-line distance", "秋石高架": "Qiushi Elevated Road", "快速路便捷通达全城，衔接主城繁华生活圈。": "A major urban expressway connecting key districts across Hangzhou.",
  "商业就在家门口": "Retail close to home", "约24万方花园城": "Approx. 240,000 sq m Garden City", "项目1.5km范围内，招商花园城、上亿广场等大型综合体举步可达。": "Large retail destinations including China Merchants Garden City and Shangyi Plaza are within about 1.5 km.",
  "全维配套 品质生活": "Everyday Convenience, Refined Living",
  "造代升级 静候新生代": "A New Chapter of Contemporary Living", "实景现房，一所见所得；全面升级，一立面景观焕新；品质可靠，一港企标准保障。": "Completed homes offer clarity and confidence, supported by renewed architecture, landscaping and Hong Kong development standards.",
  "全能户型 尽享“满配”人生": "Versatile Homes for Fuller Lives", "5#盛景弯邸，建面约65-138㎡全能户型，以紧凑尺度承载丰盛生活。": "Building 5 offers versatile homes of approximately 65–138 sq m, designed to make every metre work harder.",
  "户型选择": "Home selection", "约": "Approx. ", "㎡": " sq m", "预约品鉴": "Book a viewing",
  "65㎡起": "From 65 sq m", "绕城内难得百万级友好门槛": "An accessible entry point within Hangzhou's ring road",
  "租房不如买房": "A home of your own", "关注年轻新一代": "Designed for a new generation",
  "入住即享丰盈": "A complete life from day one", "邻立拱墅 地铁口旁": "Beside Gongshu and close to metro access",
  "三大利 诚意首开": "Three Reasons to Begin Here", "杭州城市天际线": "Hangzhou skyline", "卓能河畔轩销售中心": "Cheuk Nang Riverside Sales Centre",
  "请输入2至30个字符的姓名。": "Please enter a name between 2 and 30 characters.", "请输入正确的中国大陆手机号码。": "Please enter a valid Mainland China mobile number.", "提交失败，请稍后再试。": "Submission failed. Please try again later.", "预约已提交，置业顾问会尽快与您联系。": "Your request has been received. A property adviser will contact you shortly.", "网络响应超时，请稍后再试。": "The network timed out. Please try again later.",
  "关闭预约表单": "Close booking form", "留下联系方式，置业顾问将与您确认到访时间。": "Leave your contact details and our property adviser will confirm a viewing time.", "提交成功": "Submitted", "完成": "Done", "姓名": "Name", "请输入您的姓名": "Enter your name", "手机号码": "Mobile number", "请输入您的手机号码": "Enter your mobile number", "公司": "Company", "我同意销售人员使用上述信息联系我，仅用于预约参观与项目咨询。": "I agree that the sales team may use these details solely to contact me about a viewing and project enquiry.", "正在提交": "Submitting", "确认预约": "Confirm Booking", "或致电品鉴热线 0571 8630 9988": "Or call +86 571 8630 9988",
  "选择繁體中文": "Switch to Traditional Chinese", "选择英文": "Switch to English", "根据您的浏览器语言，我们为您准备了更合适的版本。": "A version matching your browser language is available.", "切换语言": "Switch language", "暂不切换": "Not now",
};

const traditionalOverrides = {
  "卓能·河畔轩": "卓能·河畔軒",
  "卓能河畔轩": "卓能河畔軒",
  "手机号码": "手提電話號碼",
  "请输入您的手机号码": "請輸入您的手提電話號碼",
  "品鉴热线": "品鑑熱線",
  "预约参观": "預約參觀",
  "预约品鉴": "預約品鑑",
  "置业顾问": "置業顧問",
};

const toHongKong = OpenCC.Converter({ from: "cn", to: "hk" });

export function localeFromPath(pathname = globalThis.location?.pathname || "/") {
  if (pathname === "/en" || pathname.startsWith("/en/")) return "en";
  if (pathname === "/zh-hk" || pathname.startsWith("/zh-hk/")) return "zh-HK";
  return "zh-CN";
}

export const ACTIVE_LOCALE = localeFromPath();

export function tr(value, locale = ACTIVE_LOCALE) {
  if (typeof value !== "string") return value;
  if (locale === "en") return english[value] || value;
  if (locale === "zh-HK") {
    let result = value;
    for (const [source, replacement] of Object.entries(traditionalOverrides)) result = result.replaceAll(source, replacement);
    return toHongKong(result);
  }
  return value;
}

export function localeBase(locale = ACTIVE_LOCALE) {
  if (locale === "en") return "/en";
  if (locale === "zh-HK") return "/zh-hk";
  return "";
}

export function localizedHref(href, locale = ACTIVE_LOCALE) {
  if (!href || /^(?:https?:|tel:|mailto:)/.test(href)) return href;
  const base = localeBase(locale);
  if (href.startsWith("#")) return href;
  if (!href.startsWith("/")) return href;
  if (locale === "zh-CN") return href.replace(/^\/(?:en|zh-hk)(?=\/|$)/, "") || "/";
  if (href === "/") return `${base}/`;
  if (href.startsWith(`${base}/`)) return href;
  return `${base}${href}`;
}

export function switchLocalePath(locale, pathname = globalThis.location?.pathname || "/", hash = globalThis.location?.hash || "") {
  const unprefixed = pathname.replace(/^\/(?:en|zh-hk)(?=\/|$)/, "") || "/";
  return `${localeBase(locale)}${unprefixed === "/" ? "/" : unprefixed}${hash}`;
}

export const localeLabels = [
  { locale: "zh-CN", short: "简", label: "简体中文" },
  { locale: "zh-HK", short: "繁", label: "繁體中文" },
  { locale: "en", short: "EN", label: "English" },
];
