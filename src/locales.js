import OpenCC from "opencc-js";

export const SITE_ORIGIN = "https://www.cheuknangriverside.com";

const english = {
  "品牌": "Heritage",
  "项目": "Project",
  "区位": "Location",
  "生活": "Lifestyle",
  "社区": "Community",
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
  "卓能河畔轩水岸实景": "Riverside setting at Cheuk Nang Riverside", "水岸实景": "Riverside setting",
  "卓能集团 · 首献杭州": "Cheuk Nang Group · Hangzhou Debut",
  "卓能": "Cheuk Nang",
  "河畔轩": "Riverside",
  "轻享杭州的丰盈生活": "A richer way of living in Hangzhou",
  "临平崇贤 · 滨水生活 · 建面约65-138㎡多元户型": "Chongxian, Linping · Riverside living · Homes of approx. 65–138 sq m",
  "卓能河畔轩改造效果图": "Cheuk Nang Riverside renovation rendering",
  "项目改造效果图": "Project renovation rendering",
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
  "卓能（控股）有限公司成立于1963年；1988年由赵世曾博士收购并更名为卓能。集团专注物业发展与投资，业务布局香港、中国内地、澳门及马来西亚。": "Cheuk Nang (Holdings) Limited was established in 1963 and renamed Cheuk Nang after its acquisition by Dr Cecil Chao in 1988. The group focuses on property development and investment across Hong Kong, Mainland China, Macau and Malaysia.",
  "企业成立": "established", "港交所股份代号": "HKEX stock code", "主要市场布局": "principal markets",
  "沿时间长河 稳健前行": "A steady course through time", "从建筑专业起点到跨区域物业发展，时间线梳理卓能重要人物与企业历程。个人经历与公司事件分别标注，避免混为同一口径。": "From an architectural foundation to property development across multiple markets, this timeline distinguishes personal milestones from corporate events.",
  "专业起点": "Professional foundation", "赵世曾博士于英国杜伦大学建筑系毕业。": "Dr Cecil Chao graduated from the Department of Architecture at Durham University in the United Kingdom.",
  "建筑实践": "Architectural practice", "加入香港政府建筑署担任建筑师。": "Joined the Hong Kong Government's Architectural Services Department as an architect.",
  "企业前身": "Company origins", "公司前身远东羊毛纤维有限公司成立。": "The company's predecessor, Far East Wool Fibre Limited, was established.",
  "事业发展": "Business development", "华光控股成立并上市。": "Wah Kwong Holdings was established and listed.",
  "卓能启程": "The Cheuk Nang chapter", "赵世曾博士收购远东并更名为卓能，集团由此开启新的发展阶段。": "Dr Cecil Chao acquired Far East and renamed it Cheuk Nang, beginning a new phase of development.",
  "专业荣誉": "Professional recognition", "获莫里森大学荣誉哲学博士学位，并获杰出华人奖。": "Received an honorary Doctor of Philosophy degree from Morrison University and an Outstanding Chinese Award.",
  "战略拓展": "Strategic expansion", "出售卓能广场总部并将资金重新投入中国内地、马来西亚和澳门的发展项目。": "The Cheuk Nang Plaza headquarters was sold and capital reinvested in development projects in Mainland China, Malaysia and Macau.",
  "区域认可": "Regional recognition", "荣获东盟杰出奖。": "Received an ASEAN Outstanding Award.",
  "时间线依据卓能集团官网公开资料及二期项目材料整理，展示内容用于品牌历程说明。": "The timeline is compiled from Cheuk Nang Group's public website and Phase 2 project material for an overview of the brand's development.",
  "从香港出发 布局多元市场": "From Hong Kong to multiple markets", "代表项目按照二期案场说辞与楼书整理，作为集团开发经验的简要索引。": "Selected projects are organised from the Phase 2 sales narrative and brochure as a concise index of the group's development experience.",
  "物业销售": "Property sales", "开发高端住宅、别墅、商业综合体与写字楼。": "Development of high-end residences, villas, commercial complexes and offices.", "物业租赁": "Property leasing", "持有香港及海外商业、写字楼与公寓物业。": "Ownership of commercial, office and apartment properties in Hong Kong and overseas.", "物业管理": "Property management", "为住宅、商业与会所提供配套运营服务。": "Supporting operations for residential, commercial and clubhouse properties.", "金融投资": "Financial investment", "配置港股、债券及海外证券资产。": "Investment across Hong Kong equities, bonds and overseas securities.",
  "中国香港": "Hong Kong", "中国内地与澳门": "Mainland China and Macau", "中国香港代表项目": "Selected projects in Hong Kong", "中国内地与澳门代表项目": "Selected projects in Mainland China and Macau",
  "卓能广场": "Cheuk Nang Plaza", "卓能山庄": "Cheuk Nang Lookout", "卓能中心": "Cheuk Nang Centre", "赵苑": "Villa Cecil", "一号九龙山顶": "One Kowloon Peak", "新赵苑": "New Villa Cecil", "深圳卓能雅苑": "Cheuk Nang Garden, Shenzhen", "澳门住宅及酒店式公寓项目": "Macau residences and serviced apartments",
  "项目名称与区域来自二期项目资料，具体物业状态及最新用途以卓能集团公开信息为准。": "Project names and locations come from Phase 2 material; current status and use remain subject to Cheuk Nang Group's public information.",
  "项目数据档案": "Project data record", "下列数据依据2026年6月项目介绍整理，最终以最新批准文件和销售资料为准。": "The following data is based on the June 2026 project introduction and remains subject to the latest approved documents and sales material.",
  "12.3万㎡": "123,000 sq m", "约9万㎡": "approx. 90,000 sq m", "约3.3万㎡": "approx. 33,000 sq m", "约8.96万㎡": "approx. 89,600 sq m", "约8.1万㎡": "approx. 81,000 sq m", "约4750㎡": "approx. 4,750 sq m", "约1600㎡": "approx. 1,600 sq m", "840套": "840 homes", "779个": "779 spaces", "约580个": "approx. 580 spaces", "约53%": "approx. 53%", "约47%": "approx. 47%",
  "地上建筑面积": "above-ground floor area", "地下建筑面积": "underground floor area", "计容建筑面积": "plot-ratio floor area", "高层公寓可售面积": "saleable high-rise apartment area", "排屋面积": "townhouse area", "商铺面积": "retail area", "可售车位": "saleable parking spaces", "90㎡以下户型占比": "homes below 90 sq m", "90㎡以上户型占比": "homes above 90 sq m",
  "把通勤与发展 放进同一张生活地图": "See mobility and growth on one map", "补充公交、远期轨道、城市规划与产业信息；所有未来事项均保持规划或待核实状态。": "Additional bus, future rail, planning and industry information is shown with future items clearly marked as planned or pending verification.",
  "城市规划": "Urban planning", "大城北与崇贤新城": "North Hangzhou and Chongxian New City", "资料将崇贤新城归入杭州大城北重点建设范围，并列示2024—2026年三年行动计划。规划内容应以政府部门最新公示为准。": "The material places Chongxian New City within North Hangzhou's key development area and references the 2024–2026 action plan. Planning remains subject to the latest government disclosures.",
  "公共交通": "Public transport", "公交与轨道接驳": "Bus and rail connections", "材料列示329、B7、490/490A、379、397、547M、347及8220等线路；实际站点与班次以公交运营信息为准。": "The material lists routes 329, B7, 490/490A, 379, 397, 547M, 347 and 8220; stops and services remain subject to current operator information.",
  "远期轨道": "Future rail", "地铁14号线规划": "Planned Metro Line 14", "规划中的14号线有望服务崇贤新城，相关线路、站点和建设时序仍处于规划阶段。": "The planned Line 14 may serve Chongxian New City; its alignment, stations and construction schedule remain at the planning stage.",
  "产业发展": "Industry development", "陆家桥数智产业园": "Lujiaqiao Digital Industry Park", "项目材料将其定位为高端医疗器械智造基地；建设进度、企业入驻及岗位数据以园区和政府最新信息为准。": "Project material positions it as a high-end medical-device manufacturing base; progress, tenants and employment data remain subject to current park and government information.",
  "从一张总图 走入九重场景": "From one masterplan into nine settings", "将商业街、社区入口、庭院、儿童活动与林下休憩串联为完整的景观焕新路径。": "The landscape renewal route connects retail streets, community entrances, courtyards, children's activity and shaded leisure areas.",
  "社区景观改造画廊": "Community landscape renewal gallery", "景观功能总平面": "Landscape masterplan", "规划图": "Planning diagram", "商业街": "Retail street", "北入口": "North entrance", "东入口": "East entrance", "鎏光庭院": "Liuguang Courtyard", "艺术屏风": "Art screen", "流光翠岛": "Liuguang Green Island", "疏林悦憩": "Grove retreat",
  "从抵达 到从容洽谈": "From arrival to a considered conversation", "以空间总览、前厅、水吧、过道、签约室与卫生间组成完整的案场体验路径。": "The sales-centre journey brings together the overall plan, lobby, water bar, corridor, signing room and restroom.",
  "空间总览": "Spatial overview", "平面布局": "Floor plan", "抵达": "Arrival", "前厅效果图": "Lobby rendering", "停留": "Pause", "水吧区效果图": "Water bar rendering", "过渡": "Transition", "过道区效果图": "Corridor rendering", "洽谈": "Consultation", "签约室效果图": "Signing room rendering", "细节": "Detail", "卫生间效果图": "Restroom rendering",
  "本章节均为售楼处改造效果图，实际空间以最终实施及现场呈现为准。": "All visuals in this section are sales-centre renovation renderings; actual spaces remain subject to final implementation and site presentation.",
  "入户玄关效果图": "Entrance hall rendering", "淋浴间效果图": "Shower room rendering",
  "大城北崛起": "North Hangzhou Rising", "崇贤正当时": "Chongxian's Moment",
  "你在杭州的第一个家": "Your first home in Hangzhou",
  "水岸现房": "Riverside Living", "焕新归来": "Renewed for Today", "丰盈生活的社区底图": "A community framework for fuller living",
  "项目位于杭州临平区崇贤板块，总建筑面积约12.3万平方米，规划840套住宅与779个车位。本网站呈现建筑、景观、售楼处和样板间焕新方案。": "Located in Chongxian, Linping, the development has a total gross floor area of approximately 123,000 sq m, with 840 planned homes and 779 parking spaces. This site presents the architectural, landscape, sales-centre and show-home renewal proposals.",
  "项目位于杭州临平区崇贤板块核心，踞守绕城内稀缺价格洼地。地铁、商业、教育、医疗与山水生态环伺，以主城级配套和亲民门槛，打造品质生活新标杆。": "Set in the heart of Chongxian, Linping, the project brings transport, retail, education, healthcare and waterside scenery together at an accessible entry point.",
  "万㎡": " sq m", "个": " spaces", "套": " homes", "项目总建筑面积": "total gross floor area", "规划住宅": "planned homes", "规划车位": "planned parking spaces", "盛景弯邸 首开在即": "Building 5 collection",
  "卓能河畔轩整体改造效果图": "Overall Cheuk Nang Riverside renovation rendering", "整体改造效果图": "Overall renovation rendering", "卓能河畔轩入口改造效果图": "Cheuk Nang Riverside entrance renovation rendering", "入口改造效果图": "Entrance renovation rendering",
  "观看项目影片": "Watch the project film", "项目航拍实景": "Project aerial view", "卓能河畔轩社区航拍实景": "Aerial view of Cheuk Nang Riverside", "卓能河畔轩建筑实景": "Completed architecture at Cheuk Nang Riverside",
  "杭州城市与水系航拍": "Aerial view of Hangzhou and its waterways", "纵享": "Enjoy", "杭州": "Hangzhou", "丰盈": "Abundance", "大城丰盈 · 尽享暮景\n千亿大城北，崇贤新城乘势而上": "A vibrant city · A composed outlook\nNorth Hangzhou grows, and Chongxian moves forward",
  "多维路网 通达全城": "Connected to the Whole City",
  "邻立拱墅，全维配套触手可及；一城繁华与自然资源，在日常半径内从容抵达。": "Beside Gongshu, urban amenities and natural landscapes are within an easy everyday radius.",
  "卓能河畔轩区位与城市配套图": "Cheuk Nang Riverside location and amenities map",
  "在建": "Under construction", "已运营": "In operation", "已运营／待核实": "In operation / verify current status", "在建／规划": "Under construction / planned", "生态实景": "Existing natural setting",
  "地铁15号线崇贤站": "Metro Line 15 Chongxian Station", "资料显示A出入口距项目西门约200米、距主入口约350米，计划2028年开通。": "Project material places Exit A about 200 m from the west gate and about 350 m from the main entrance, with opening planned for 2028.",
  "全龄教育资源": "Education for every age", "项目约2公里范围内覆盖幼儿园、小学与中学；具体招生范围以教育主管部门最新政策为准。": "Kindergartens, primary schools and secondary schools are located within about 2 km; admission areas remain subject to the latest education-authority policy.",
  "商业生活圈": "Everyday retail", "上亿广场及招商城北花园城等商业资源位于项目约1.5公里生活半径内，运营状态以实地为准。": "Retail destinations including Shangyi Plaza and China Merchants North Hangzhou Garden City are within an approximately 1.5 km living radius; current operations should be verified on site.",
  "医疗健康配套": "Healthcare amenities", "区域资料列示邵逸夫医院分院、临平区中医院崇贤分院等医疗资源，交付与运营时间以官方信息为准。": "Regional material lists a Sir Run Run Shaw Hospital branch and the Chongxian branch of Linping District Hospital of Traditional Chinese Medicine; completion and operation dates remain subject to official information.",
  "滨水公园体系": "Waterside park network", "项目与石塘公园隔河相望，周边分布半山国家森林公园、虎山公园等生态资源。": "The development faces Shitang Park across the water, with Banshan National Forest Park, Hushan Park and other natural amenities nearby.",
  "配套距离、建设进度及招生范围来自2026年项目资料，最终以政府部门、运营机构及现场实际为准。": "Distances, construction progress and admission information are based on 2026 project material and remain subject to government authorities, operators and actual site conditions.",
  "约400m直线距离": "Approx. 400 m straight-line distance", "地铁15号线站口": "Metro Line 15 station",
  "约700m直线距离": "Approx. 700 m straight-line distance", "秋石高架": "Qiushi Elevated Road", "快速路便捷通达全城，衔接主城繁华生活圈。": "A major urban expressway connecting key districts across Hangzhou.",
  "商业就在家门口": "Retail close to home", "约24万方花园城": "Approx. 240,000 sq m Garden City", "项目1.5km范围内，招商花园城、上亿广场等大型综合体举步可达。": "Large retail destinations including China Merchants Garden City and Shangyi Plaza are within about 1.5 km.",
  "全维配套 品质生活": "Everyday Convenience, Refined Living",
  "鎏光逸境 焕新社区": "A renewed garden community", "鎏光归家": "A considered arrival", "绿野乐园": "Garden playground", "森氧俱乐部": "Garden clubhouse",
  "以更清晰的归家秩序重塑社区入口，让建筑、林荫与礼序在第一眼自然衔接。": "A clearer arrival sequence brings architecture, trees and a sense of ceremony together from the first moment.",
  "儿童活动、环形场地与林下看护空间相互连接，形成可参与的全龄社区日常。": "Play spaces, circular activity areas and shaded supervision zones connect into an inclusive everyday setting.",
  "把休闲、会客与轻运动置入绿荫之间，为社区补充更松弛的共享生活场景。": "Leisure, conversation and light exercise sit within the greenery, adding relaxed shared spaces to the community.",
  "疏林、花境与邻里停留空间共同构成安静而有层次的社区花园。": "Trees, seasonal planting and places to pause create a calm, layered community garden.",
  "改造效果图": "Renovation rendering",
  "从空间尺度 预见生活日常": "See everyday life through space", "以约67㎡和约138㎡两类样板间方案，呈现不同家庭结构下的收纳、会客与休憩场景。": "Show-home concepts of approximately 67 and 138 sq m illustrate storage, gathering and rest for different household needs.",
  "约67㎡ 苏式原木风": "Approx. 67 sq m · Suzhou-inspired natural timber", "约138㎡ 美式风格": "Approx. 138 sq m · American-inspired interior", "客餐厅效果图": "Living and dining rendering", "主卧效果图": "Primary bedroom rendering", "客卧效果图": "Guest bedroom rendering", "室内效果图": "Interior rendering",
  "造代升级 静候新生代": "A New Chapter of Contemporary Living",
  "循水入境 看见焕新蓝图": "Follow the water into a renewed vision", "项目影片保留完整播放入口；画面所示实景与效果方案以现场及最终实施结果为准。": "The full project film remains available; existing scenes and design proposals shown remain subject to site conditions and final implementation.",
  "多元户型 回应不同家庭结构": "Homes for different household needs", "建面约65-138㎡四类户型，以清晰的功能分区承接初次置业、家庭成长与改善需求。": "Four plans of approximately 65–138 sq m use clear functional zoning for first homes, growing families and more spacious living.",
  "初次置业与一人居": "First-home buyers and solo living", "两口之家与成长型一居": "Couples and adaptable one-bedroom living", "小家庭与弹性三房需求": "Small families and flexible three-bedroom needs", "改善家庭与多代同住": "Larger families and multigenerational living",
  "全能户型 尽享“满配”人生": "Versatile Homes for Fuller Lives", "5#盛景弯邸，建面约65-138㎡全能户型，以紧凑尺度承载丰盛生活。": "Building 5 offers versatile homes of approximately 65–138 sq m, designed to make every metre work harder.",
  "户型选择": "Home selection", "约": "Approx. ", "㎡": " sq m", "预约品鉴": "Book a viewing",
  "65㎡起": "From 65 sq m", "关注年轻新一代": "Designed for a new generation",
  "入住即享丰盈": "A complete life from day one", "邻立拱墅 地铁口旁": "Beside Gongshu and close to metro access",
  "三大利 诚意首开": "Three Reasons to Begin Here", "杭州城市天际线": "Hangzhou skyline", "卓能河畔轩销售中心": "Cheuk Nang Riverside Sales Centre",
  "一河相望": "Across the water", "滨水生态日常": "A waterside everyday", "15号线在建": "Line 15 underway", "城市南北通达": "North–south city links", "65-138㎡": "65–138 sq m", "多元家庭选择": "Choices for different households", "丰盈生活 由此展开": "A fuller life begins here", "所有配套与产品信息均以最新公示及现场实际为准": "All amenity and product information remains subject to the latest official disclosures and actual site conditions",
  "请输入2至30个字符的姓名。": "Please enter a name between 2 and 30 characters.", "请输入正确的中国大陆手机号码。": "Please enter a valid Mainland China mobile number.", "提交失败，请稍后再试。": "Submission failed. Please try again later.", "预约已提交，置业顾问会尽快与您联系。": "Your request has been received. A property adviser will contact you shortly.", "网络响应超时，请稍后再试。": "The network timed out. Please try again later.",
  "关闭预约表单": "Close booking form", "留下联系方式，置业顾问将与您确认到访时间。": "Leave your contact details and our property adviser will confirm a viewing time.", "提交成功": "Submitted", "完成": "Done", "姓名": "Name", "请输入您的姓名": "Enter your name", "手机号码": "Mobile number", "请输入您的手机号码": "Enter your mobile number", "公司": "Company", "我同意销售人员使用上述信息联系我，仅用于预约参观与项目咨询。": "I agree that the sales team may use these details solely to contact me about a viewing and project enquiry.", "正在提交": "Submitting", "确认预约": "Confirm Booking", "或致电品鉴热线 0571 8630 9988": "Or call +86 571 8630 9988",
  "测试环境：你可以体验表单流程，但提交内容不会保存或发送。": "Test environment: you can experience the form, but submissions are not stored or sent.", "这是测试表单，提交内容不会保存或发送给销售人员。": "This is a test form. Your submission was not stored or sent to the sales team.",
  "电话预约": "Book by phone", "杭州市临平区崇贤街道崇杭街108-17号卓能河畔轩销售中心": "Cheuk Nang Riverside Sales Centre, No. 108-17 Chonghang Street, Chongxian, Linping District, Hangzhou",
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
