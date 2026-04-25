// Curated starter content. Each piece is ready to import as a deck, or to
// simplify with Claude.ai (Max Plan) first for a learner at a lower level.
// Add entries over time; this is meant to grow as Jan curates.

export type StarterArticle = {
  slug: string;
  title: string;
  titleEn: string;
  suggestedHsk: 1 | 2 | 3 | 4 | 5 | 6;
  tags: string[];
  source?: { name: string; url?: string };
  summary: string;
  text: string;
};

export const starterArticles: StarterArticle[] = [
  {
    slug: "cafe-business-meeting",
    title: "咖啡馆的商务会面",
    titleEn: "A business meeting at a café",
    suggestedHsk: 4,
    tags: ["business", "daily", "dialogue"],
    summary:
      "Short dialogue between two people discussing a project proposal over coffee. Practical business Chinese vocabulary in context.",
    text: `今天下午三点，我在咖啡馆见了一位新客户。她是一家新创公司的市场经理，希望我们能帮助她们做品牌推广。
我们一边喝咖啡一边聊她们的项目。她告诉我，她们的产品主要面向年轻人，所以需要一个更有创意的营销方案。
我问她预算大概是多少，她说公司给了十万元做三个月的测试。我觉得这个数字还算合理，所以答应下周给她一份详细的计划书。
离开之前，我们约好下周五再见一次面，讨论具体的合作细节。`,
  },

  {
    slug: "wechat-mini-programs",
    title: "微信小程序如何改变了中国商业",
    titleEn: "How WeChat Mini Programs changed Chinese commerce",
    suggestedHsk: 5,
    tags: ["business", "technology", "trend"],
    summary:
      "Short explainer on why Mini Programs (小程序) became such a dominant channel for Chinese businesses. Real business-tech vocabulary.",
    text: `微信小程序自从2017年推出以来，已经彻底改变了中国的商业模式。和传统的应用程序不同，小程序不需要下载安装，用户只要扫一扫二维码或者在微信里搜索，就可以直接使用。
对商家来说，开发小程序的成本比开发独立App低得多。更重要的是，小程序可以利用微信庞大的用户基础，让品牌直接触达消费者。许多餐厅、零售店、甚至政府服务都已经推出了自己的小程序。
分析人士认为，小程序的成功不仅改变了中国互联网生态，也让微信从一个聊天工具变成了一个连接一切的超级平台。未来几年，小程序很可能继续成为中国商业数字化的重要工具。`,
  },

  {
    slug: "dji-founder-interview-excerpt",
    title: "大疆创始人访谈节选：关于创新与挑战",
    titleEn: "DJI founder interview excerpt: on innovation and challenges",
    suggestedHsk: 6,
    tags: ["business", "technology", "interview"],
    summary:
      "Excerpt from an interview with Frank Wang (汪滔), DJI founder. Discusses the company's approach to innovation and global competition. **This one is dense — consider using the Claude.ai simplify button to adapt it to your level before importing.**",
    text: `在一次采访中，大疆创新的创始人汪滔谈到了公司成立以来所面临的挑战。他表示，从一开始，大疆就决定走一条与众不同的道路——不仅仅是模仿国外的技术，而是要在无人机领域建立自己的核心竞争力。
汪滔认为，中国制造业长期以来被贴上"低端模仿"的标签，但真正的创新需要耐心和长期的投入。大疆在成立的头几年几乎没有盈利，所有的资金都投入到了研发当中。正是这种坚持，让大疆逐渐在全球消费级无人机市场占据了领先地位。
然而，随着国际竞争日趋激烈，加上地缘政治因素的影响，大疆也面临着前所未有的外部压力。汪滔坦言，未来的挑战不仅来自技术层面，更来自如何在复杂的全球环境中保持企业的独立性和创造力。他强调，无论环境如何变化，大疆都会坚持以产品和用户体验为核心，做出真正有价值的东西。`,
  },

  {
    slug: "moomoocat-silicon-bullies-carbon",
    title: "霸凌越来越过分了",
    titleEn: "Silicon is bullying carbon (the AI sector vs. everything else)",
    suggestedHsk: 6,
    tags: ["business", "finance", "markets", "AI", "opinion"],
    source: {
      name: "猫笔刀 (moomoocat)",
      url: "https://mp.weixin.qq.com/s/eLPzXJkOO1z8HTPdZ2Edeg",
    },
    summary:
      "Sharp finance-blog commentary by Chinese investor 猫笔刀 (moomoocat) on how AI-related stocks (光模块 / optical modules) are dominating the Chinese stock market while everything human-facing gets sucked dry. Plus quick takes on the Trump–Iran ceasefire, Adobe's $25B buyback, Korea's birth-rate bump, and DeepSeek's $20B fundraise. Dense, opinionated, full of modern markets vocab and slang. Heavy — try the simplify loop first if you're below HSK 6.",
    text: `这几天的行情简单总结成一句话，就是硅基概念正在疯狂霸凌碳基概念。所谓碳基就是人类，硅基就是ai，所有服务于ai的板块都在大涨特涨，所有服务于人类的股票都被虹吸惨了。这几天圈子里整天看到相关的段子，"你相信光（模块）吗？"，"老登你还没被淘汰啊？"，市场风格正在加速收束和集中，新一轮的抱团正在走向高潮。
今年行情好吗，其实一般，我刚看了一下截止今天收盘a股2026年的涨跌幅中位数是+0.58%，只涨了一点点，依然有48.3%的股票今年累计是下跌的。所以今年真的很容易就不挣钱，关键看你的投资风格有没有站在"光"的那一侧。
以光模块为主的通信设备行业今年涨了48%，高居涨幅榜首，这还是在去年上涨98%基础上的空中加油，已经在事实上确立了风格霸权，并在对其他行业风格进行一轮又一轮的霸凌。
我刚进股市的时候整个a股只有1000来家公司，行情像是在吃大锅饭，基本上同涨同跌，没有像现在这样尖锐的风格站队。现如今大盘涨跌已经不那么重要了，贯穿全年的牛市也有跌10-20%的板块，就算大盘不涨也有板块可以翻倍。
随着市场fomo情绪持续上升，越来越多的人开始动摇，这几天后台老多人问我能不能追光模块，这责任我担不起，我判断不了顶部和拐点，我自己的方案就是拿宽基，利用指数内部的马太效应去跟踪收益，肯定没有那些重仓ai的人赚得多，但中证500指数今年+12.2%，叠加贴水将近有16%，我觉得这也不错。重要的是我这么玩不需要动脑，不需要择时，不用站队，不会纠结，也不必焦虑。我没有很相信光，我也不质疑光，我不会去拥抱光，但被光照到了我也不抗拒。
给新读者简单科普一下什么是光模块。服务器产出的是电信号，想要通过光纤传输需要转换成光信号，等光纤把光信号送到目的地，又需要把光信号转换回电信号，才能输入目的地服务器。这个电-光-电来回转换的设备，就是光模块。通俗理解的话，它就是算力集群的"高铁站"，信息就是"乘客"，光纤就是"铁路线"。
听起来也不是技术门槛很高的行业，那会不会全球爆产能，大家内卷到产能过剩呢？没那么容易，光模块是一个极致追求产能、成本、良率的产业，像头部那几个大厂，其实他们做的东西别的二线厂也能做出来能用的样品，但是头部厂产能大，良率高（95%+），成本低，这里面有很多技术细节，二线厂做不到，比如他们的良率只有75-80%，听着也很高对吗，但结果就是被淘汰。中国的光模块在全球市占率接近70%，靠的就是稳定大产能，高良率，低成本。但这玩意和稀土不一样，你不能用它卡欧美脖子，如果愿意牺牲成本的话国外是能替代的。
1、特朗普宣布延长停火协议的时间，而且不设具体延长的期限，他自己解释原因是伊朗内部需要时间协调统一，才能给出一个谈判的方案，他会等对方给出的方案。本来万斯21日是要去伊斯兰堡的，但看伊朗代表团不去，他也不去了。不过双方现在都不想打，所以都接受了停火延期。从目前的发展来看未来美伊可能在局部有摩擦，但像3月份那样大规模的动武可能性小。最重要的是全球股市正在对伊朗局势逐渐脱敏，哪怕布油又涨回到99附近，也没耽误今天股市上涨。
2、adobe宣布新一轮250亿美元的回购。adobe就是photoshop的母公司，图片处理软件的世界巨头，过去两年被ai冲击惨了，大家都觉得ai发展下去会干死大部分的软件公司。adobe的股价从高位700跌下来，现在只有255，回撤63%。话说美国公司回购是真的狠，要知道adobe目前总市值也才1000亿左右，这把一口气要回购1/4的股票，这力度你们感受一下。250亿美元折合人民币1700亿左右，而整个a股去年的累计回购规模是1400亿左右，这就是中美股市最最最最核心的差异。
3、韩国2月份出生人口同比增长13.6%，新增了22898个婴儿，这是2019年以来2月份同期新高。综合生育率来到了0.93，比之前的历史最低点0.75反弹了将近20%。这对我们来说肯定是个好消息，证明人口出生率这东西不是无底洞，跌到极限了是会反弹的。
4、业内最近一直在传deepseek要商业化融资了，一开始估值传100亿美元，最新传腾讯和阿里要以200亿美元的估值入股。200亿美元其实也不算贵，目前国内的大模型也都300-600亿美元区间。不过deepseek之前一炮走红后这几年在行业内的声量逐渐下滑，和美国模型已经显著拉开差距。公司因为商业化程度低，核心团队被国内同行疯狂挖墙脚，这个也正常，我相信梁文峰肯定不差钱，但是底下那么多工程师还没财富自由，他们有权利追求更好的回报，我估计这可能也是deepseek终于想通了的原因。`,
  },
];

export function getStarterArticle(slug: string): StarterArticle | null {
  return starterArticles.find((a) => a.slug === slug) ?? null;
}
