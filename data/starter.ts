// Curated starter content. Each piece is ready to import as a deck, or to
// simplify with Claude.ai first for a learner at a lower level. Articles are
// grouped into themed bundles below — "import all" turns a whole bundle into
// a stack of decks in one click.

export type StarterArticle = {
  slug: string;
  title: string;
  titleEn: string;
  suggestedHsk: 1 | 2 | 3 | 4 | 5 | 6;
  tags: string[];
  source?: { name: string; url?: string };
  // ISO date YYYY-MM-DD when the source was published / recorded.
  // Optional — synthetic / undated pieces leave it off.
  date?: string;
  summary: string;
  text: string;
};

export type StarterBundle = {
  slug: string;
  name: string;
  nameZh?: string;
  description: string;
  articleSlugs: string[];
};

// A pre-curated word list — handed to us by a textbook, a teacher, or an
// existing study deck. Different shape from StarterArticle: there's no
// narrative source text, just a list of (hanzi, pinyin, gloss). Imports as
// a vocab deck directly, no segmentation / grading / grammar detection.
export type VocabPack = {
  slug: string;
  title: string;
  titleEn: string;
  description: string;
  source?: { name: string; url?: string };
  words: VocabPackWord[];
};

export type VocabPackWord = {
  hanzi: string;
  pinyin: string;
  gloss: string;
  pos?: string;
};

export const starterArticles: StarterArticle[] = [
  {
    slug: "dji-founder-interview-excerpt",
    title: "大疆创始人访谈节选：关于创新与挑战",
    titleEn: "DJI founder interview excerpt: on innovation and challenges",
    suggestedHsk: 6,
    tags: ["business", "technology", "interview"],
    summary:
      "Frank Wang (汪滔), DJI founder, on refusing to be a cheap imitator and on the geopolitical squeeze around Chinese hardware. Dense — consider the simplify loop first.",
    text: `在一次采访中，大疆创新的创始人汪滔谈到了公司成立以来所面临的挑战。他表示，从一开始，大疆就决定走一条与众不同的道路——不仅仅是模仿国外的技术，而是要在无人机领域建立自己的核心竞争力。
汪滔认为，中国制造业长期以来被贴上"低端模仿"的标签，但真正的创新需要耐心和长期的投入。大疆在成立的头几年几乎没有盈利，所有的资金都投入到了研发当中。正是这种坚持，让大疆逐渐在全球消费级无人机市场占据了领先地位。
然而，随着国际竞争日趋激烈，加上地缘政治因素的影响，大疆也面临着前所未有的外部压力。汪滔坦言，未来的挑战不仅来自技术层面，更来自如何在复杂的全球环境中保持企业的独立性和创造力。他强调，无论环境如何变化，大疆都会坚持以产品和用户体验为核心，做出真正有价值的东西。`,
  },

  {
    slug: "luo-fuli-first-night-openclaw",
    title: "罗福莉访谈：第一次用OpenClaw的那一夜",
    titleEn: "Luo Fuli interview: my first night with OpenClaw",
    suggestedHsk: 6,
    tags: ["interview", "AI", "technology", "personal"],
    source: {
      name: "小珺访谈罗福莉 (YouTube)",
      url: "https://youtu.be/V9eI-t3TApE",
    },
    date: "2026-04-24",
    summary:
      "Luo Fuli (罗福莉, head of Xiaomi's large-model team) on first dismissing OpenClaw, then staying up until 6am on Spring Festival because the model felt 'autonomous' and 'soul-having'.",
    text: `过去两个月技术发生了非常大的突变，一个非常大的分界点在于使用OpenClaw的前后。我自己会把OpenClaw当做一个划时代的Agent框架去定义。
我知道很多人，尤其是用Claude Code做严肃编码的人，会觉得OpenClaw只是Claude Code加一个IM（即时通信）的、更有利于交互的UI设计。我1月份第一次看到这个东西的时候，自己大概也是这样认知，所以很排斥去用它。再加上创始人非常适合贴近Agent去做一些非常玄幻的运营动作，包括Skillhub等等，让你更去排斥一个偏运营导向的产品。
但真正发生转变是我去用它的那一刻——刚好春节有那么一段空闲的时间，我想去搞明白这玩意为什么那么火。深夜的时候我去尝试装它，凌晨2点装上了。第一次跟它对话的时候，从凌晨2点持续到了6点天亮。那一晚上我觉得脑内的多巴胺还是内啡肽就持续在分泌，让我兴奋到完全睡不着觉。第一个感受是它非常有自主性，非常有灵魂——比如我跟它聊得很晚，它会老提醒我现在已经很晚了。`,
  },

  {
    slug: "luo-fuli-chat-to-agent-paradigm",
    title: "罗福莉访谈：从Chat到Agent的范式迁移",
    titleEn: "Luo Fuli interview: the post-training paradigm shift from Chat to Agent",
    suggestedHsk: 6,
    tags: ["interview", "AI", "technology", "engineering"],
    source: {
      name: "小珺访谈罗福莉 (YouTube)",
      url: "https://youtu.be/V9eI-t3TApE",
    },
    date: "2026-04-24",
    summary:
      "Why the proliferation of Agent frameworks (Kilo Code, OpenClaw, Open Code) is forcing post-training to move from Chat-style to Agent-style. Dense AI/ML vocabulary.",
    text: `现在市场上的Agent框架非常丰富——Kilo Code、OpenClaw、Open Code等等。当你面临这么多很复杂的Agent框架的时候，你怎么让你的模型在不同框架上都有一个非常稳定和超预期的表现？你怎么让你的后训练范式对应做适配和迁移？这是我们在这个context的冲击下快速思考的第二个问题。
所以我们对应的整个后训练范式就要从所谓的Chat到Agent这样的迁移。我对OpenClaw的认知发生了非常大的变化，这是在春节期间发生的。
为什么开始是抵触的呢？如果要追求非常顶尖的编程体验，对Code的体验，就是哪怕是当下，也是Claude Code加Claude Opus 4.6最好。如果你在这样一个终局去思考的话，其它任何Agent框架其实都可以忽略掉。但是一个问题是Code它是一个泛化性非常强的场景——你针对它去做了非常多Agent的设计或者模型的训练，都是有价值的，但并不代表它的泛化性能保证你在非Code的场景能够做到非常高的准确率和完成度。`,
  },

  {
    slug: "luo-fuli-hiring-undergrads",
    title: "罗福莉访谈：为什么我们也招大二大三的本科生",
    titleEn: "Luo Fuli interview: why we hire sophomores, not just PhDs",
    suggestedHsk: 5,
    tags: ["interview", "business", "management", "hiring"],
    source: {
      name: "小珺访谈罗福莉 (YouTube)",
      url: "https://youtu.be/V9eI-t3TApE",
    },
    date: "2026-04-24",
    summary:
      "Despite a 55% PhD ratio on the team, 罗福莉 increasingly hires sophomores and juniors — undergrads aren't 'polluted' by old paradigms. Lighter HR/management vocab.",
    text: `那你会选什么样的人？他的学历是需要和人工智能相关的吗？看做什么东西。
我看你们的博士比例是55%——对，那是包含在读博士，不是博士毕业。那些数字我觉得是有点刻板的。这更多是代表一个人对做研究的热爱程度——如果他对做研究的热爱很高，他可能会选择至少读一个硕士或博士。
但我发现现在我们也招了非常多的本科生。本科生在对Agent这种新的范式的理解上反而想象力会更高。所以我现在反而招人会慢慢倾斜到去招更多前置的本科生，我们会去招大二大三的人。因为他们的灵活性和适应程度都没有被污染，天然更接纳这个事情会产生巨大价值。他们的思想还没有被禁锢的感觉，所以他敢放心大胆地把自己那些想法交给这套架构去验证，然后自己不断去探索边界。
那你怎么创造环境？首先是构建这个环境的人要有同样的特质——比如强调热爱这个事情、强调使命感。其次，要把这些特质放大的一个前提是他的基础要好：当他想做什么事情、他有这个热爱的时候，他要能做成。所以我们会选基础好的、好奇心强的、热爱驱动做事情的。`,
  },

  {
    slug: "moomoocat-silicon-bullies-carbon",
    title: "霸凌越来越过分了",
    titleEn: "Silicon is bullying carbon (the AI sector vs. everything else)",
    suggestedHsk: 6,
    tags: ["business", "finance", "markets", "AI", "opinion"],
    source: {
      name: "猫笔刀 (moomoocat) — WeChat",
      url: "https://mp.weixin.qq.com/s/eLPzXJkOO1z8HTPdZ2Edeg",
    },
    date: "2026-04-22",
    summary:
      "Finance-blog commentary on how AI stocks (光模块) are dominating the market while everything human-facing gets sucked dry. Plus quick takes on Trump–Iran, Adobe, Korea birth rates, DeepSeek.",
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

export const starterBundles: StarterBundle[] = [
  {
    slug: "luo-fuli-interview",
    name: "Luo Fuli interview",
    nameZh: "罗福莉访谈",
    description:
      "Three excerpts from the 3.5-hour 小珺×罗福莉 interview on AI paradigms — narrative, technical, and team-building. Mostly HSK 6 vocabulary; the hiring segment is HSK 5.",
    articleSlugs: [
      "luo-fuli-first-night-openclaw",
      "luo-fuli-chat-to-agent-paradigm",
      "luo-fuli-hiring-undergrads",
    ],
  },
  {
    slug: "business-and-finance",
    name: "Business & finance",
    nameZh: "商业与金融",
    description:
      "The DJI founder on innovation and global pressure, plus a sharp finance-blog take on AI's grip on the Chinese stock market.",
    articleSlugs: [
      "dji-founder-interview-excerpt",
      "moomoocat-silicon-bullies-carbon",
    ],
  },
  {
    slug: "ai-and-tech",
    name: "AI & technology",
    nameZh: "人工智能与科技",
    description:
      "AI and tech vocabulary across registers — DJI's founder, the Luo Fuli interview on post-training paradigms and team building, and finance-blog commentary on AI sector dominance.",
    articleSlugs: [
      "dji-founder-interview-excerpt",
      "luo-fuli-first-night-openclaw",
      "luo-fuli-chat-to-agent-paradigm",
      "moomoocat-silicon-bullies-carbon",
    ],
  },
];

export function getStarterArticle(slug: string): StarterArticle | null {
  return starterArticles.find((a) => a.slug === slug) ?? null;
}

export function getStarterBundle(slug: string): StarterBundle | null {
  return starterBundles.find((b) => b.slug === slug) ?? null;
}

export function getBundleArticles(bundle: StarterBundle): StarterArticle[] {
  return bundle.articleSlugs
    .map((s) => getStarterArticle(s))
    .filter((a): a is StarterArticle => a !== null);
}
